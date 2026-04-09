# Learning Assistant Backend

FastAPI backend for the Learning Assistant project.

## Tech Stack

- Python
- FastAPI
- SQLAlchemy
- PostgreSQL
- Uvicorn

## Prerequisites

- Python 3.14+
- PostgreSQL database

## Setup

1. Create and activate a virtual environment.
2. Install dependencies:

```bash
pip install -e .
```

3. Create a `.env` file in `backend/`.

Example:

```env
DATABASE_URL=postgresql+psycopg2://postgres:password@localhost:5432/learning_assistant
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
GEMINI_API_KEY=your-gemini-key
ALLOWED_ORIGINS=http://localhost:5173
```

## Run the API

```bash
uvicorn main:app --reload
```

Base URL (default): `http://127.0.0.1:8000`

## Available Routes (Current)

All routes are prefixed with `/api`.

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Dashboard

- `GET /api/dashboard/stats`
- `GET /api/dashboard/activities`

### Documents

- `GET /api/documents`
- `POST /api/documents/upload` (multipart form-data, field name: `file`, PDF only)
- `DELETE /api/documents/{id}`
