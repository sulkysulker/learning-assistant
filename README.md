# Learning Assistant

Learning Assistant is a full-stack study companion that lets users upload PDFs, extract and query the content with Gemini, and generate quizzes and flashcards from the same document. The application combines a React frontend with a FastAPI backend and PostgreSQL database to turn uploaded course material into AI-assisted learning workflows.

Live demo: [your Railway frontend URL]

## Tech stack

| Layer    | Stack                                      | Notes                                                                                             |
| -------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Frontend | React 19, Vite, Tailwind CSS, React Router | Single-page application in `frontend/learning-assistant` served through nginx in Docker           |
| Backend  | FastAPI, SQLAlchemy, Pydantic, Uvicorn     | REST API for auth, documents, quizzes, flashcards, and dashboard data                             |
| Database | PostgreSQL 15                              | Relational data model for users, documents, quizzes, flashcards, and activity history             |
| AI       | Google Gemini via `google-genai`           | Used for grounded document chat, summaries, concept explanations, quiz generation, and flashcards |
| DevOps   | Docker Compose, GitHub Actions, Railway    | Local orchestration and CI checks; Railway is the deployment target for production                |

## Features

### Document Management

- PDF upload with content-type and extension validation in `documentController.py`
- Stored file metadata and local file persistence in `backend/uploads/`
- Document listing, detail retrieval, file download, and deletion by owner
- Cached extracted text for repeated AI calls without re-reading the PDF file

### AI Features

- Grounded chat over uploaded documents using `generate_grounded_answer`
- One-click summary generation from document text
- Concept explanation using document-focused context windows
- Quiz generation from PDF content with validated question structures
- Flashcard set generation from document concepts and difficulty tags

### Learning Tools

- Quiz submission and scoring with per-question feedback and explanations
- Latest-attempt tracking and score history per quiz
- Flashcard review tracking and starred card support
- Dashboard activity feed showing created quizzes, documents, and flashcard sets

### User Management

- User registration and login with JWT-based session handling
- Password change flow using bcrypt-hashed credentials
- Per-user document, quiz, and flashcard ownership checks
- Protected routes using `Depends(get_current_user)` and token verification

## Getting started (local dev)

### Prerequisites

- Docker
- Node 20
- Python 3.11

### Steps

1. Clone the repository:

```bash
git clone <repo-url>
cd "Learning Assistant"
```

2. Create the backend environment file from the example:

```bash
cp backend/.env.example backend/.env
```

3. Fill in the values in `backend/.env` before starting containers. At minimum set:
   - `SECRET_KEY`
   - `GEMINI_API_KEY`
   - `ALLOWED_ORIGINS` if you are running a frontend on a non-default port
   - `DATABASE_URL` if you are not using the docker Compose default

4. Start the application stack:

```bash
docker compose up --build
```

5. Open the app in a browser:
   - Frontend: `http://localhost`
   - Backend API: `http://localhost:8000/docs`

## Environment variables

The project reads runtime values from `backend/.env` and the compose file passes them into the backend container. The current example file is `backend/.env.example`.

| Variable          | Description                                     | Example value                                                        |
| ----------------- | ----------------------------------------------- | -------------------------------------------------------------------- |
| `DATABASE_URL`    | PostgreSQL connection string used by SQLAlchemy | `postgresql+psycopg2://postgres:postgres@db:5432/learning_assistant` |
| `DEBUG`           | FastAPI debug flag                              | `False`                                                              |
| `SECRET_KEY`      | JWT signing secret                              | `change-me`                                                          |
| `ALGORITHM`       | JWT algorithm                                   | `HS256`                                                              |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowlist                  | `http://localhost:5173,http://localhost:80`                          |
| `GEMINI_API_KEY`  | Google Gemini API key for AI generation         | `your-gemini-api-key`                                                |

## CI/CD

GitHub Actions is configured in `.github/workflows/ci.yml` and runs on pushes and pull requests to `main`.

The workflow currently performs:

- Backend lint with Ruff (`backend/`)
- Frontend lint with ESLint (`frontend/learning-assistant/`)
- Docker image build validation using `docker compose build`

The deployment model is: a green `main` branch passes CI, then Railway auto-deploys the app. The Docker Compose stack is the same runtime model used locally, and the production service is expected to consume the same environment values through Railway project variables.

## Design decisions

### Why FastAPI over Django/Flask

FastAPI is a better fit for this codebase because the app relies on typed request and response validation through Pydantic, clean dependency injection for database sessions and auth, and lightweight API routing with explicit tags and response models. The backend also integrates directly with SQLAlchemy and OAuth2 security primitives without the overhead of a larger framework stack.

### Why PostgreSQL over NoSQL for this use case

The schema uses relational joins and constraints across `users`, `documents`, `flashcard_sets`, `flashcards`, `quizzes`, `quiz_questions`, and `quiz_attempts`. PostgreSQL is a natural fit for owner-based access control, per-document generation history, and transactional updates such as deleting a document while cascading related quiz and flashcard metadata. The JSON fields for `answers`, `options`, and `quiz` payloads also allow flexible question data while maintaining a structured SQL model.

### How AI calls are handled today

AI generation is currently synchronous. In `controllers/documentController.py`, `controllers/quizController.py`, and `controllers/flashcardController.py`, the request thread calls Gemini directly, waits for the provider response, validates the payload, and then stores the result in PostgreSQL. For example, document chat, summary generation, concept explanation, quiz creation, and flashcard generation all happen inline during the same HTTP request. The intended future state is Celery + Redis: queue the AI task, return a job or status token to the client, and process generation asynchronously in workers.

### PDF storage: local disk now, S3 migration path

Uploads are stored on the local filesystem under `backend/uploads/`, and each `Document` record points to the saved file path. This keeps the initial deployment simple and works well with Docker volumes. The migration path is straightforward: replace the local disk path with an S3 object key/URL model, store the object in a bucket, and keep the same `Document` table as the source of truth for metadata and ownership. That allows the application to remain stateless at the web layer while moving large binary assets to a durable object store.

---

## Project status

This project is a working full-stack learning assistant for PDF-based study workflows with AI-assisted content generation and tracking. The current implementation emphasizes a compact, deployable architecture with a clear upgrade path for async AI processing and cloud storage.
