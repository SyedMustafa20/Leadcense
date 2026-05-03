from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.user import router as user_router
from api.webhook import router as webhook_router
from api.dashboard import router as dashboard_router
from api.playground import router as playground_router
from api.leads import router as leads_router
from api.agents import router as agents_router
from api.conversations import router as conversations_router
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(title="WhatsApp Lead Qualifier")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user_router)
app.include_router(webhook_router)
app.include_router(dashboard_router)
app.include_router(playground_router)
app.include_router(leads_router)
app.include_router(agents_router)
app.include_router(conversations_router)


@app.get("/health")
def read_root():
    return {"status": "ok"}