from fastapi import APIRouter, Depends
from app.auth.verify_token import verify_token

router = APIRouter()

@router.get("/protected")
def protected_route(user=Depends(verify_token)):

    return {
        "message": "Protected Route",
        "user": user
    }