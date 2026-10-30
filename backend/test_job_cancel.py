import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

os.environ.setdefault('MONGO_URL', 'mongodb://mock-mongo:27017/testdb')
os.environ.setdefault('JWT_SECRET_KEY', 'test-secret-key')
os.environ.setdefault('JWT_ALGORITHM', 'HS256')
os.environ.setdefault('JWT_EXPIRATION_MINUTES', '60')
os.environ.setdefault('STRIPE_SECRET_KEY', 'sk_test_mock')
os.environ.setdefault('STRIPE_PRICE_ID', 'price_mock')

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

with patch('motor.motor_asyncio.AsyncIOMotorClient'):
    import server

from fastapi import HTTPException


def jobs_db(job, modified=1):
    db = MagicMock()
    db.upload_jobs.find_one = AsyncMock(return_value=job)
    db.upload_jobs.update_one = AsyncMock(return_value=MagicMock(modified_count=modified))
    return db


@pytest.mark.asyncio
async def test_a_queued_job_is_cancelled_and_its_credit_returned():
    job = {'id': 'j1', 'user_id': 'u1', 'status': 'queued', 'payload': {'credit_reserved': True}}
    db = jobs_db(job)
    with patch.object(server, 'db', db), patch.object(server, 'refund_credit', AsyncMock()) as refund:
        res = await server.cancel_my_job('j1', current_user={'id': 'u-q'})
    assert res['cancelled'] is True
    query, update = db.upload_jobs.update_one.await_args_list[0].args
    assert query['status'] == 'queued' and update['$set']['status'] == 'cancelled'
    refund.assert_awaited_once()


@pytest.mark.asyncio
async def test_a_running_job_is_asked_to_stop():
    job = {'id': 'j2', 'user_id': 'u1', 'status': 'processing', 'payload': {}}
    db = jobs_db(job, modified=0)
    with patch.object(server, 'db', db), patch.object(server, 'refund_credit', AsyncMock()) as refund:
        await server.cancel_my_job('j2', current_user={'id': 'u-p'})
    update = db.upload_jobs.update_one.await_args_list[1].args[1]
    assert update['$set']['cancel_requested'] is True
    refund.assert_not_awaited()


@pytest.mark.asyncio
async def test_finished_jobs_and_other_peoples_jobs_are_left_alone():
    db = jobs_db({'id': 'j3', 'user_id': 'u1', 'status': 'succeeded'})
    with patch.object(server, 'db', db):
        res = await server.cancel_my_job('j3', current_user={'id': 'u-f'})
    assert res['cancelled'] is False
    db.upload_jobs.update_one.assert_not_awaited()

    db = jobs_db(None)
    with patch.object(server, 'db', db), pytest.raises(HTTPException) as err:
        await server.cancel_my_job('j4', current_user={'id': 'u-o'})
    assert err.value.status_code == 404
    assert db.upload_jobs.find_one.await_args.args[0] == {'id': 'j4', 'user_id': 'u-o'}
