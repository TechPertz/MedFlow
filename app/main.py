from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import medical, index_management
from app.utils.config import settings

app = FastAPI(title="MedMind AI", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

app.include_router(medical.router)
app.include_router(index_management.router)

@app.get("/")
async def root():
    return {"status": "Medical AI Service Running"}