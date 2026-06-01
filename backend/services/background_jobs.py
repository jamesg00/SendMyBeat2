from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Awaitable, Callable

from pymongo import ReturnDocument


JobHandler = Callable[[dict], Awaitable[None]]


class BackgroundJobService:
    def __init__(
        self,
        *,
        db,
        logger: logging.Logger,
        poll_interval_seconds: int,
        stale_after_seconds: int,
        worker_id: str | None = None,
        now_factory: Callable[[], str] | None = None,
    ) -> None:
        self.db = db
        self.logger = logger
        self.poll_interval_seconds = poll_interval_seconds
        self.stale_after_seconds = stale_after_seconds
        self.worker_id = worker_id or f"job-worker-{uuid.uuid4().hex[:10]}"
        self.now_factory = now_factory or (lambda: datetime.now(timezone.utc).isoformat())
        self.handlers: dict[str, JobHandler] = {}

    def set_handlers(self, handlers: dict[str, JobHandler]) -> None:
        self.handlers = handlers

    def sanitize_job_doc(self, doc: dict | None) -> dict | None:
        if not doc:
            return None
        return {
            "id": doc.get("id"),
            "type": doc.get("type"),
            "user_id": doc.get("user_id"),
            "status": doc.get("status"),
            "progress": int(doc.get("progress") or 0),
            "message": doc.get("message") or "",
            "stage": doc.get("stage"),
            "last_heartbeat_at": doc.get("last_heartbeat_at"),
            "attempts": int(doc.get("attempts") or 0),
            "max_attempts": int(doc.get("max_attempts") or 0),
            "cancel_requested": bool(doc.get("cancel_requested") or False),
            "error_code": doc.get("error_code"),
            "failed_stage": doc.get("failed_stage"),
            "media_debug": doc.get("media_debug"),
            "result": doc.get("result"),
            "error": doc.get("error"),
            "created_at": doc.get("created_at"),
            "updated_at": doc.get("updated_at"),
        }

    async def update_job(
        self,
        job_id: str,
        *,
        status: str | None = None,
        progress: int | None = None,
        message: str | None = None,
        result: dict | None = None,
        error: str | None = None,
        extra_updates: dict[str, Any] | None = None,
    ) -> None:
        updates: dict[str, Any] = {"updated_at": self.now_factory()}
        if status is not None:
            updates["status"] = status
        if progress is not None:
            updates["progress"] = max(0, min(100, int(progress)))
        if message is not None:
            updates["message"] = message
        if result is not None:
            updates["result"] = result
        if error is not None:
            updates["error"] = error
        if extra_updates:
            updates.update(extra_updates)
        await self.db.upload_jobs.update_one({"id": job_id}, {"$set": updates})

    async def create_job(
        self,
        *,
        current_user: dict,
        job_type: str,
        payload: dict[str, Any],
        priority: int = 1,
        message: str = "Queued for background processing.",
    ) -> dict:
        now = self.now_factory()
        job_doc = {
            "id": str(uuid.uuid4()),
            "type": job_type,
            "user_id": current_user["id"],
            "status": "queued",
            "priority": int(priority),
            "progress": 0,
            "message": message,
            "stage": "queued",
            "last_heartbeat_at": now,
            "attempts": 0,
            "max_attempts": 2 if job_type == "youtube_upload" else 1,
            "cancel_requested": False,
            "error_code": None,
            "failed_stage": None,
            "payload": payload,
            "result": None,
            "error": None,
            "created_at": now,
            "updated_at": now,
        }
        await self.db.upload_jobs.insert_one(job_doc)
        return job_doc

    async def claim_next_job(self) -> dict | None:
        now = self.now_factory()
        return await self.db.upload_jobs.find_one_and_update(
            {"status": "queued"},
            {"$set": {
                "status": "processing",
                "progress": 5,
                "message": "Worker claimed job.",
                "stage": "validate",
                "last_heartbeat_at": now,
                "updated_at": now,
                "started_at": now,
                "worker_id": self.worker_id,
            }},
            sort=[("priority", 1), ("created_at", 1)],
            return_document=ReturnDocument.AFTER,
        )

    async def requeue_stale_jobs(self) -> None:
        cutoff = (datetime.now(timezone.utc) - timedelta(seconds=self.stale_after_seconds)).isoformat()
        await self.db.upload_jobs.update_many(
            {
                "status": "processing",
                "updated_at": {"$lt": cutoff},
            },
            {"$set": {
                "status": "queued",
                "progress": 0,
                "message": "Job requeued after worker restart.",
                "stage": "queued",
                "last_heartbeat_at": self.now_factory(),
                "updated_at": self.now_factory(),
            }},
        )

    async def touch_heartbeat(
        self,
        job_id: str,
        *,
        stage: str | None = None,
        message: str | None = None,
        progress: int | None = None,
    ) -> None:
        extra_updates: dict[str, Any] = {"last_heartbeat_at": self.now_factory()}
        if stage is not None:
            extra_updates["stage"] = stage
        await self.update_job(
            job_id,
            progress=progress,
            message=message,
            extra_updates=extra_updates,
        )

    async def get_job(self, job_id: str) -> dict | None:
        return await self.db.upload_jobs.find_one({"id": job_id}, {"_id": 0})

    @staticmethod
    def _parse_iso_timestamp(value: Any) -> datetime | None:
        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        if not isinstance(value, str) or not value.strip():
            return None
        try:
            parsed = datetime.fromisoformat(value)
        except ValueError:
            return None
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)

    async def run_watchdog_pass(
        self,
        *,
        default_timeout_seconds: int,
        stage_timeouts: dict[str, int] | None = None,
    ) -> dict[str, int]:
        now_dt = datetime.now(timezone.utc)
        processing_jobs = await self.db.upload_jobs.find(
            {"status": "processing"},
            {"_id": 0},
        ).to_list(None)
        requeued = 0
        failed = 0
        stage_timeouts = stage_timeouts or {}

        for job in processing_jobs:
            stage = str(job.get("stage") or "").strip() or "unknown"
            timeout_seconds = int(stage_timeouts.get(stage) or default_timeout_seconds)
            heartbeat = self._parse_iso_timestamp(job.get("last_heartbeat_at")) or self._parse_iso_timestamp(job.get("updated_at"))
            if heartbeat is None:
                continue
            if (now_dt - heartbeat).total_seconds() <= timeout_seconds:
                continue

            attempts = int(job.get("attempts") or 0)
            max_attempts = int(job.get("max_attempts") or 1)
            update_filter = {
                "id": job["id"],
                "status": "processing",
                "updated_at": job.get("updated_at"),
            }
            if attempts < max_attempts:
                result = await self.db.upload_jobs.update_one(
                    update_filter,
                    {
                        "$set": {
                            "status": "queued",
                            "progress": 0,
                            "message": "Requeued after timeout.",
                            "stage": "queued",
                            "updated_at": self.now_factory(),
                            "last_heartbeat_at": self.now_factory(),
                            "worker_id": self.worker_id,
                            "error_code": None,
                            "failed_stage": None,
                        },
                        "$inc": {"attempts": 1},
                    },
                )
                if getattr(result, "modified_count", 0):
                    requeued += 1
            else:
                result = await self.db.upload_jobs.update_one(
                    update_filter,
                    {
                        "$set": {
                            "status": "failed",
                            "progress": 100,
                            "message": "Job failed after watchdog timeout.",
                            "error": f"Job timed out during stage '{stage}'.",
                            "error_code": "JOB_TIMEOUT",
                            "failed_stage": stage,
                            "updated_at": self.now_factory(),
                            "last_heartbeat_at": self.now_factory(),
                            "failed_at": self.now_factory(),
                            "worker_id": self.worker_id,
                        }
                    },
                )
                if getattr(result, "modified_count", 0):
                    failed += 1
        return {"requeued": requeued, "failed": failed}

    async def process_job(self, job: dict) -> None:
        job_type = str(job.get("type") or "").strip()
        handler = self.handlers.get(job_type)
        if not handler:
            await self.update_job(
                job["id"],
                status="failed",
                progress=100,
                message="Job failed.",
                error=f"Unsupported job type: {job_type}",
                extra_updates={"failed_at": self.now_factory(), "worker_id": self.worker_id},
            )
            return
        await handler(job)

    async def worker_loop(self) -> None:
        while True:
            try:
                job = await self.claim_next_job()
                if not job:
                    await asyncio.sleep(self.poll_interval_seconds)
                    continue
                await self.process_job(job)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                self.logger.error(f"Background job worker loop error: {str(exc)}")
                await asyncio.sleep(self.poll_interval_seconds)
