#!/usr/bin/env bash
set -euo pipefail
python -m uvicorn backend.app.main:app --reload --port 8000
