from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.rides import router as ride_router
from app.routes.drivers import router as driver_router

app = FastAPI()

# CORS CONFIG
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ROUTES
app.include_router(ride_router)
app.include_router(driver_router)

@app.get("/")
def home():
    return {
        "message": "Cab Backend Running"
    }