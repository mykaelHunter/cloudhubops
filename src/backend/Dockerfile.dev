# Stage 1: Builder
FROM python:3.13-alpine AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apk add --no-cache \
    gcc \
    musl-dev \
    postgresql-dev \
    libffi-dev \
    build-base

WORKDIR /app

COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Stage 2: Final Runtime
FROM python:3.13-alpine AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apk add --no-cache netcat-openbsd libpq dos2unix

# Create user first, before copying files
RUN adduser -D appuser

WORKDIR /app

# Copy installed packages and app code
COPY --from=builder /root/.local /home/appuser/.local
COPY . .

# Fix line endings and permissions
RUN dos2unix docker-entrypoint.sh && \
    chmod +x docker-entrypoint.sh && \
    chown -R appuser:appuser /app /home/appuser/.local

USER appuser

ENV PATH=/home/appuser/.local/bin:$PATH

EXPOSE 5000

ENTRYPOINT ["./docker-entrypoint.sh"]
