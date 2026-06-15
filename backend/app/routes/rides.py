from fastapi import APIRouter
from app.firebase import db
from uuid import uuid4
from datetime import datetime
from firebase_admin import firestore
from app.services.fare_engine import (
    calculate_fare
)
from app.services.ola_maps import (
    calculate_distance
)
from app.services.ola_maps import (
    calculate_distance,
    get_route_data
)

router = APIRouter(prefix="/rides", tags=["Rides"])


@router.post("/create")
def create_ride(data: dict):

    ride_id = str(uuid4())

    status = (
        "scheduled"
        if data.get("rideType") == "scheduled"
        else "searching"
    )

    ride_data = {

        "rideId": ride_id,

        "customerId": data["customerId"],

        "pickup": data["pickup"],

        "destination": data["destination"],

        "distanceKm": data["distanceKm"],

        "estimatedFare": data["estimatedFare"],

        "vehicleType":
            data.get(
                "vehicleType",
                "any"
            ),

        "rideType":
            data.get(
                "rideType",
                "now"
            ),

        "pickupDate":
            data.get("pickupDate", ""),

        "pickupTime":
            data.get("pickupTime", ""),

        "driverId": None,

        "reservedDriverId": None,

        "otp":
            data["otp"],

        "status": status,

        "createdAt":
            firestore.SERVER_TIMESTAMP
    }

    db.collection("rides") \
        .document(ride_id) \
        .set(ride_data)

    return {
        "success": True,
        "rideId": ride_id
    }

@router.post("/route-data")
def route_data(data: dict):

    result = get_route_data(

        data["originLat"],
        data["originLng"],

        data["destLat"],
        data["destLng"]
    )

    return result

@router.get("/available-rides/{area}")
def available_rides(area: str):

    rides_ref = db.collection("rides") \
        .where("status", "==", "searching") \
        .stream()

    rides = []

    for ride in rides_ref:

        ride_data = ride.to_dict()

        rides.append({
            "rideId": ride.id,
            **ride_data
        })

    return rides

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

@router.post("/estimate-fare")
def estimate_fare(data: dict):

    distance_km = data["distanceKm"]

    fare = calculate_fare(
        distance_km
    )

    return {
        "distanceKm":
            distance_km,

        "estimatedFare":
            fare
    }

@router.post("/calculate-distance")
def calculate_distance_api(
    data: dict
):

    distance_km = \
        calculate_distance(
            data["originLat"],
            data["originLng"],
            data["destLat"],
            data["destLng"]
        )

    return {
        "distanceKm":
            distance_km
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

@router.post("/update-status")
def update_status(data: dict):

    ride_ref = db.collection("rides").document(
        data["rideId"]
    )

    ride_ref.update({
        "status": data["status"]
    })

    return {
        "success": True
    }

@router.post("/reserve")
def reserve_ride(
    data: dict
):

    ride_ref = (
        db.collection("rides")
        .document(
            data["rideId"]
        )
    )

    ride_ref.update({
        "reservedDriverId":
            data["driverId"],
        "status":
            "reserved"
    })

    return {
        "success": True
    }

@router.post("/cancel-reservation")
def cancel_reservation(data: dict):

    db.collection("rides") \
      .document(data["rideId"]) \
      .update({
          "status": "scheduled",
          "reservedDriverId": None
      })

    return {"success": True}

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