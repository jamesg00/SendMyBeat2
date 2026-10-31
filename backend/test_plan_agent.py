"""The plan agent (drafts a plan step for you) and re-pinned pro channels."""

import os
import sys
from types import SimpleNamespace
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

from services import pros

TAZ = pros.BY_ID['taz-taylor']


def test_each_step_kind_gets_the_right_kind_of_help():
    assert pros.assist_mode({'kind': 'title_formula'}) == 'titles'
    assert pros.assist_mode({'kind': 'title_pair'}) == 'titles'
    assert pros.assist_mode({'kind': 'uploads'}) is None
    assert pros.assist_mode({'kind': 'manual', 'link': 'descriptions'}) == 'description'
    assert pros.assist_mode({'kind': 'manual', 'text': 'Send a beat pack'}) == 'help'


def test_description_prompts_carry_the_current_template_and_forbid_invented_facts():
    step = {'kind': 'manual', 'link': 'descriptions', 'text': 'Add lease terms', 'move': TAZ['moves'][0]['title']}
    system, prompt = pros.assist_prompt(
        'description', step, TAZ, their_titles=['Juice WRLD Type Beat "Ghost"'], your_titles=['dark trap beat'],
        your_searches=['lil uzi'], description='Buy: [link]',
    )
    assert 'JSON' in system
    assert 'Buy: [link]' in prompt and 'never invent prices' in prompt
    assert TAZ['moves'][0]['body'] in prompt and 'lil uzi' in prompt


def test_answers_are_trimmed_and_empty_ones_rejected():
    titles = pros.parse_assist('titles', {'summary': 's', 'titles': ['a', ' ', 'b'] + ['x'] * 10})
    assert titles == {'mode': 'titles', 'summary': 's', 'titles': ['a', 'b', 'x', 'x', 'x']}
    desc = pros.parse_assist('description', {'summary': 's', 'content': 'New template'})
    assert desc['title'] == 'Plan description' and desc['content'] == 'New template'
    with pytest.raises(ValueError):
        pros.parse_assist('titles', {'titles': []})
    with pytest.raises(ValueError):
        pros.parse_assist('help', {'content': '  '})
    with pytest.raises(ValueError):
        pros.parse_assist('help', 'not json')


def plan_db(steps):
    db = MagicMock()
    db.__getitem__.return_value.find_one = AsyncMock(return_value={'pro_id': 'taz-taylor', 'steps': steps})
    return db


@pytest.mark.asyncio
async def test_upload_steps_have_nothing_to_draft():
    db = plan_db([{'id': 's1', 'kind': 'uploads', 'text': 'Upload 3', 'target': 3}])
    with patch.object(server, 'db', db), pytest.raises(HTTPException) as err:
        await server.assist_style_plan_step('s1', current_user={'id': 'u1'})
    assert err.value.status_code == 400


@pytest.mark.asyncio
async def test_unknown_steps_404():
    db = plan_db([])
    with patch.object(server, 'db', db), pytest.raises(HTTPException) as err:
        await server.assist_style_plan_step('nope', current_user={'id': 'u1'})
    assert err.value.status_code == 404


@pytest.mark.asyncio
async def test_asking_for_help_queues_a_paid_job():
    db = plan_db([{'id': 's1', 'kind': 'title_formula', 'text': 'Lead 3 titles', 'target': 3, 'move': 'x'}])
    queue = AsyncMock(return_value={'id': 'job-1', 'type': 'plan_assist', 'status': 'queued'})
    with patch.object(server, 'db', db), \
         patch.object(server, '_guard_heavy_feature', AsyncMock()), \
         patch.object(server, '_find_active_background_job', AsyncMock(return_value=None)), \
         patch.object(server, '_queue_paid_job', queue):
        res = await server.assist_style_plan_step('s1', current_user={'id': 'u-agent'})
    assert res['queued'] is True
    assert queue.await_args.kwargs['payload']['mode'] == 'titles'
    assert queue.await_args.kwargs['job_type'] == 'plan_assist'


@pytest.mark.asyncio
async def test_a_failed_agent_job_refunds_its_credit():
    job = {'id': 'j1', 'user_id': 'u1', 'payload': {'step_id': 's1', 'credit_reserved': True}}
    with patch.object(server, '_execute_plan_assist_job', AsyncMock(side_effect=RuntimeError('llm down'))), \
         patch.object(server, '_update_upload_job', AsyncMock()) as update, \
         patch.object(server, 'refund_credit', AsyncMock()) as refund:
        await server._process_plan_assist_job(job)
    refund.assert_awaited_once_with('u1')
    assert update.await_args.kwargs['status'] == 'failed'


def test_nick_mira_is_pinned_to_his_own_channel():
    assert pros.BY_ID['nick-mira']['channel_id'] == 'UC0__rMNmefKfxeB-82fuCWA'


def test_a_cache_holding_another_channel_is_refetched():
    nick = pros.BY_ID['nick-mira']
    assert pros.wrong_channel(nick, {'channel_id': 'UC_internet_money_xxxxxxx'})
    assert not pros.wrong_channel(nick, {'channel_id': nick['channel_id']})
    assert not pros.wrong_channel(nick, None)
    assert pros.wrong_channel(nick, {'channel_id': nick['channel_id']}, {'channel_id': 'UCadmin_pinned_xxxxxxxxx'})
