#!/bin/sh

set -e

echo "Starting Taskapp Backend Container"

echo "Waiting for database at $DB_HOST:$DB_PORT..."
while ! nc -z $DB_HOST $DB_PORT; do
  sleep 0.1
done

echo "Database is ready!"

echo "Running database migrations..."
flask --app run db upgrade
echo "Database migrations completed"

echo "Seeding database"
python seed.py

echo "Starting Gunicorn server..."
exec gunicorn \
         --bind 0.0.0.0:${PORT:-5000} \
         --workers ${WORKERS:-4} \
         --worker-class sync \
         --worker-connections 1000 \
         --timeout 60 \
         --keep-alive 2 \
         --max-requests 1000 \
         --max-requests-jitter 50 \
         --access-logfile - \
         --error-logfile - \
         --capture-output \
         --enable-stdio-inheritance \
         "run:app"
