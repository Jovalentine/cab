from fastapi import Header, HTTPException
import firebase_admin
from firebase_admin import auth

def verify_token(authorization: str = Header(None)):

    if not authorization:
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = authorization.split(" ")[1]

    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token

    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Token")