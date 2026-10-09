# Vercel serverless entry point: every /api/* request is handled by the EcoSort FastAPI app.
from server.main import app  # noqa: F401
