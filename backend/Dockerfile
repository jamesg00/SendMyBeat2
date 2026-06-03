FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (e.g., ffmpeg for video processing)
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 8000

# Single worker process: background job worker runs in-process and relies on MongoDB for job state.
# Do not run multiple uvicorn/gunicorn workers without a dedicated external job consumer.
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
