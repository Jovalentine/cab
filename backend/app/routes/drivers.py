from fastapi import APIRouter
from app.firebase import db

router = APIRouter(prefix="/drivers", tags=["Drivers"])


@router.post("/status")
def update_driver_status(data: dict):

    driver_ref = db.collection("users").document(data["driverId"])

    driver_ref.update({
        "online": data["online"],
        "available": data["available"]
    })
    
    return {
        "success": True
    }

    
@router.get("/available-rides/{area}")
def available_rides(area: str):

    # Filter by area if your Firestore documents store a pickup area/city field
    rides_ref = db.collection("rides") \
        .where("status", "==", "searching") \
        .stream()

    rides = []

    for ride in rides_ref:
        ride_data = ride.to_dict()
        rides.append(ride_data)

    return rides


@router.post("/accept")
def accept_ride(data: dict):

    ride_ref = db.collection("rides").document(data["rideId"])
    ride_snap = ride_ref.get()

    # Check if the ride document actually exists first to avoid crashes
    if not ride_snap.exists:
        return {
            "success": False,
            "message": "Ride not found"
        }

    ride = ride_snap.to_dict()

    if ride.get("status") != "searching":
        return {
            "success": False,
            "message": "Ride already accepted or unavailable"
        }

    ride_ref.update({
        "driverId": data["driverId"],
        "status": "accepted"
    })

    return {
        "success": True
    }

@router.get("/online-drivers")
def online_drivers():

    drivers_ref = db.collection("users") \
        .where("role", "==", "driver") \
        .where("online", "==", True) \
        .where("blocked", "!=", True) \
        .stream()

    drivers = []

    for driver in drivers_ref:

        drivers.append({
            "id": driver.id,
            **driver.to_dict()
        })

    return drivers


@router.post("/update-status")
def update_status(data: dict):

    ride_ref = db.collection("rides").document(data["rideId"])

    ride_ref.update({
        "status": data["status"]
    })

    return {
        "success": True
    }