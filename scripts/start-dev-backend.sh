#!/bin/bash
# Local dev backend — loads backend/.env.dev, runs on port 8001
# Never committed with secrets; .env.dev is gitignored via *.env.*

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$ROOT_DIR/backend/.env.dev"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found. Copy backend/.env.example to backend/.env.dev and fill in your values."
  exit 1
fi

export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)

cd "$ROOT_DIR/backend"
echo "Starting dev backend on http://localhost:8001 ..."
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
