FROM python:3.11-slim AS development

WORKDIR /app

# Primero las dependencias: mejor cache de capas en rebuilds
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Evita escribir .pyc y acelera el reload en desarrollo
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1

EXPOSE 8100

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8100"]
