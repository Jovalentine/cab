from fastapi import APIRouter
from app.firebase import db

router = APIRouter()

@router.get("/test-firestore")
def test_firestore():

    doc_ref = db.collection("test").document("sample")

    doc_ref.set({
        "message": "Firebase Connected"
    })

    return {"success": True}