from fastapi import APIRouter
from app.firebase import db
import uuid
from datetime import datetime

router = APIRouter(prefix="/rides", tags=["Rides"])


@router.post("/create")
def create_ride(data: dict):

    ride_id = str(uuid.uuid4())

    ride_data = {
        "rideId": ride_id,
        "customerId": data["customerId"],
        "pickup": data["pickup"],
        "drop": data["drop"],
        "fare": data["fare"],
        "status": "searching",
        "driverId": None,
        "createdAt": datetime.utcnow()
    }

    db.collection("rides").document(ride_id).set(ride_data)

    return {
        "success": True,
        "rideId": ride_id
    }

@router.post("/manual-assign")
def manual_assign(data: dict):

    ride_ref = db.collection("rides") \
        .document(data["rideId"])

    ride_ref.update({
        "driverId": data["driverId"],
        "status": "accepted"
    })

    return {
        "success": True
    }

@router.post("/accept")
def accept_ride(data: dict):

    ride_ref = db.collection("rides").document(data["rideId"])

    ride_ref.update({
        "driverId": data["driverId"],
        "status": "accepted"
    })

    return {
        "success": True
    }
    
@router.post("/cancel")
def cancel_ride(data: dict):

    ride_ref = db.collection("rides") \
        .document(data["rideId"])

    ride_ref.update({
        "status": "cancelled"
    })

    return {
        "success": True
    }