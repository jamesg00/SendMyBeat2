from __future__ import annotations

import asyncio
import logging
import traceback
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
            "stage_started_at": doc.get("stage_started_at"),
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
        now = self.now_factory()
        updates: dict[str, Any] = {"updated_at": now}
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
            if "stage" in extra_updates:
                updates["stage_started_at"] = now
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
            "stage_started_at": now,
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
                "stage_started_at": now,
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
        now = self.now_factory()
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
                "stage_started_at": now,
                "last_heartbeat_at": now,
                "updated_at": now,
            }},
        )

    async def touch_heartbeat(
        self,
        job_id: str,
        *,
        message: str | None = None,
        progress: int | None = None,
    ) -> None:
        # Heartbeats prove the worker is alive but must not reset stage timeout clocks.
        await self.update_job(
            job_id,
            progress=progress,
            message=message,
            extra_updates={"last_heartbeat_at": self.now_factory()},
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
        worker_dead_seconds: int | None = None,
    ) -> dict[str, int]:
        now_dt = datetime.now(timezone.utc)
        processing_jobs = await self.db.upload_jobs.find(
            {"status": "processing"},
            {"_id": 0},
        ).to_list(None)
        requeued = 0
        failed = 0
        stage_timeouts = stage_timeouts or {}
        worker_dead_seconds = int(worker_dead_seconds or self.stale_after_seconds)

        for job in processing_jobs:
            stage = str(job.get("stage") or "").strip() or "unknown"
            timeout_seconds = int(stage_timeouts.get(stage) or default_timeout_seconds)
            stage_started = (
                self._parse_iso_timestamp(job.get("stage_started_at"))
                or self._parse_iso_timestamp(job.get("started_at"))
                or self._parse_iso_timestamp(job.get("updated_at"))
            )
            last_heartbeat = (
                self._parse_iso_timestamp(job.get("last_heartbeat_at"))
                or self._parse_iso_timestamp(job.get("updated_at"))
            )
            if stage_started is None:
                continue

            stage_elapsed = (now_dt - stage_started).total_seconds()
            heartbeat_stale = (
                last_heartbeat is not None
                and (now_dt - last_heartbeat).total_seconds() > worker_dead_seconds
            )
            if stage_elapsed <= timeout_seconds and not heartbeat_stale:
                continue

            attempts = int(job.get("attempts") or 0)
            max_attempts = int(job.get("max_attempts") or 1)
            update_filter = {
                "id": job["id"],
                "status": "processing",
                "updated_at": job.get("updated_at"),
            }
            timeout_reason = (
                "worker heartbeat lost"
                if heartbeat_stale and stage_elapsed <= timeout_seconds
                else f"stage '{stage}' exceeded {timeout_seconds}s"
            )
            if attempts < max_attempts:
                result = await self.db.upload_jobs.update_one(
                    update_filter,
                    {
                        "$set": {
                            "status": "queued",
                            "progress": 0,
                            "message": "Requeued after timeout.",
                            "stage": "queued",
                            "stage_started_at": self.now_factory(),
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
                    self.logger.warning(
                        "Watchdog requeued job %s (%s): %s",
                        job.get("id"),
                        job.get("type"),
                        timeout_reason,
                    )
            else:
                result = await self.db.upload_jobs.update_one(
                    update_filter,
                    {
                        "$set": {
                            "status": "failed",
                            "progress": 100,
                            "message": "Job failed after watchdog timeout.",
                            "error": f"Job timed out: {timeout_reason}.",
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
                    self.logger.error(
                        "Watchdog failed job %s (%s): %s",
                        job.get("id"),
                        job.get("type"),
                        timeout_reason,
                    )
        return {"requeued": requeued, "failed": failed}

    async def fail_job_if_processing(
        self,
        job_id: str,
        *,
        error: str,
        error_code: str,
        failed_stage: str,
        message: str = "Job failed.",
    ) -> bool:
        now = self.now_factory()
        result = await self.db.upload_jobs.update_one(
            {"id": job_id, "status": "processing"},
            {
                "$set": {
                    "status": "failed",
                    "progress": 100,
                    "message": message,
                    "error": error,
                    "error_code": error_code,
                    "failed_stage": failed_stage,
                    "failed_at": now,
                    "updated_at": now,
                    "last_heartbeat_at": now,
                    "worker_id": self.worker_id,
                }
            },
        )
        return bool(getattr(result, "modified_count", 0))

    async def process_job(self, job: dict) -> None:
        job_type = str(job.get("type") or "").strip()
        job_id = str(job.get("id") or "")
        handler = self.handlers.get(job_type)
        if not handler:
            await self.update_job(
                job_id,
                status="failed",
                progress=100,
                message="Job failed.",
                error=f"Unsupported job type: {job_type}",
                extra_updates={
                    "failed_at": self.now_factory(),
                    "worker_id": self.worker_id,
                    "error_code": "UNSUPPORTED_JOB_TYPE",
                    "failed_stage": "queued",
                },
            )
            return
        self.logger.info(
            "Processing job id=%s type=%s stage=%s progress=%s",
            job_id,
            job_type,
            job.get("stage"),
            job.get("progress"),
        )
        try:
            await handler(job)
        except Exception as exc:
            self.logger.error(
                "Unhandled exception in job %s (%s): %s\n%s",
                job_id,
                job_type,
                exc,
                traceback.format_exc(),
            )
            await self.fail_job_if_processing(
                job_id,
                error=str(exc) or exc.__class__.__name__,
                error_code="WORKER_UNHANDLED",
                failed_stage=str(job.get("stage") or "unknown"),
            )
            return

        refreshed = await self.get_job(job_id)
        if refreshed and refreshed.get("status") == "processing":
            self.logger.error(
                "Job %s (%s) handler returned while still processing at stage=%s progress=%s",
                job_id,
                job_type,
                refreshed.get("stage"),
                refreshed.get("progress"),
            )
            await self.fail_job_if_processing(
                job_id,
                error="Background worker finished without marking the job complete.",
                error_code="WORKER_EXITED",
                failed_stage=str(refreshed.get("stage") or "unknown"),
            )

    async def worker_loop(self) -> None:
        while True:
            try:
                job = await self.claim_next_job()
                if not job:
                    await asyncio.sleep(self.poll_interval_seconds)
                    continue
                self.logger.info(
                    "Worker claimed job id=%s type=%s user_id=%s",
                    job.get("id"),
                    job.get("type"),
                    job.get("user_id"),
                )
                await self.process_job(job)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                self.logger.error(f"Background job worker loop error: {str(exc)}")
                await asyncio.sleep(self.poll_interval_seconds)
