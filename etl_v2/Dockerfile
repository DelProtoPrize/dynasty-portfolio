FROM python:3.12-slim

WORKDIR /app

COPY etl/requirements.txt ./etl/requirements.txt
RUN pip install --no-cache-dir -r etl/requirements.txt psycopg2-binary

COPY etl/ ./etl/
COPY etl_v2/ ./etl_v2/

CMD ["python", "-m", "etl_v2.run", "--output", "db"]
