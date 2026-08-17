"""
Main application entry point.
This file initializes the FastAPI application.
You should configure CORS, import your main API routers from `app.routes`,
and set up any global application events (like lifespan events) here.
"""
from fastapi import FastAPI

from app.routes.rag import router as rag_router

app = FastAPI(title="FlowForge-AI API")

app.include_router(rag_router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Welcome! Please refer to the folder docstrings to understand where to put your code."
    }
