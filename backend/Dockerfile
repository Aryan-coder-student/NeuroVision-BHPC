FROM python:3.11-slim

# Prevent Python from writing .pyc and buffer
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Django Core
COPY . .

# Expose API Port
EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
