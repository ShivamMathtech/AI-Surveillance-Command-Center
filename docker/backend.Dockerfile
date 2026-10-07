FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install -r backend/requirements.txt && useradd -u 10001 -m scc && mkdir -p /data /media && chown scc:scc /data /media
COPY backend /app/backend
COPY ai /app/ai
COPY simulation /app/simulation
COPY database /app/database
USER scc
ENV DATA_DIR=/data
EXPOSE 8000
CMD ["sh","-c","alembic -c database/alembic.ini upgrade head && uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --workers 1"]
