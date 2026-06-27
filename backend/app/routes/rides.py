from fastapi import APIRouter
from app.firebase import db
from uuid import uuid4
from datetime import datetime, timezone
from firebase_admin import firestore
from app.services.ola_maps import (
    calculate_distance
)
from app.services.ola_maps import (
    calculate_distance,
    get_route_data
)
from app.services.fare_engine import (
    calculate_fare,
    calculate_wait_charge,
    calculate_final_fare
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

    vehicle_type = data.get(
        "vehicleType",
        "any"
    )

    if vehicle_type == "any":

        mini_fare = calculate_fare(
            data["distanceKm"],
            "mini"
        )

        base_estimated_fare = mini_fare["estimatedFare"]

        estimated_fare = None

    else:

        fare = calculate_fare(
            data["distanceKm"],
            vehicle_type
        )

        estimated_fare = fare["estimatedFare"]

        base_estimated_fare = fare["estimatedFare"]

    ride_data = {

        "rideId": ride_id,

        "customerId": data["customerId"],

        "pickup": data["pickup"],

        "destination": data["destination"],

        "distanceKm": data["distanceKm"],

        "estimatedFare": estimated_fare,

        "baseFare": fare["baseFare"] if vehicle_type != "any" else mini_fare["baseFare"],

        "distanceFare": fare["distanceFare"] if vehicle_type != "any" else mini_fare["distanceFare"],

        "surgeCharge": fare["surgeCharge"] if vehicle_type != "any" else mini_fare["surgeCharge"],

        "timeMultiplier": fare["timeMultiplier"] if vehicle_type != "any" else mini_fare["timeMultiplier"],

        "baseEstimatedFare":
            base_estimated_fare,

        "vehicleType": vehicle_type,

        "vehicleTypeAssigned": None,
        
         "waitStartTime": None,

        "waitEndTime": None,

        "waitTimeMinutes": 0,

        "waitCharge": 0,

        "returnStarted": False,
                
        "rideType":
            data.get(
                "rideType",
                "now"
            ),

        "pickupDate":
            data.get("pickupDate", ""),

        "pickupTime":
            data.get("pickupTime", ""),

        "tripType":
            data.get(
                "tripType",
                "one_way"
            ),

        "returnDate":
            data.get(
                "returnDate",
                ""
            ),

        "returnTime":
            data.get(
                "returnTime",
                ""
            ),

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

    vehicle_type = data.get(
    "vehicleType",
    "mini"
        )

    fare = calculate_fare(
    distance_km,
    vehicle_type
        )

    return fare

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

    driver = db.collection("users") \
        .document(data["driverId"]) \
        .get() \
        .to_dict()

    driver_vehicle = driver.get(
        "vehicleType",
        "mini"
    )

    ride = ride_ref.get().to_dict()

    update_data = {
        "driverId": data["driverId"],
        "vehicleTypeAssigned":
            driver_vehicle,

        "status": "accepted"
    }

    if ride["vehicleType"] == "any":

        fare = calculate_fare(
            ride["distanceKm"],
            driver_vehicle
        )

        update_data["estimatedFare"] = fare["estimatedFare"]

        update_data["baseFare"] = fare["baseFare"]

        update_data["distanceFare"] = fare["distanceFare"]

        update_data["surgeCharge"] = fare["surgeCharge"]

        update_data["timeMultiplier"] = fare["timeMultiplier"]

    ride_ref.update(update_data)

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

@router.post("/start-waiting")
def start_waiting(data: dict):

    ride_ref = db.collection("rides").document(
        data["rideId"]
    )

    ride_ref.update({
        "status": "waiting_return",

        "waitStartTime":
            firestore.SERVER_TIMESTAMP
    })

    return {
        "success": True
    }

@router.post("/resume-trip")
def resume_trip(data: dict):

    ride_ref = db.collection("rides").document(
        data["rideId"]
    )

    ride = ride_ref.get().to_dict()

    wait_start = ride.get(
        "waitStartTime"
    )

    wait_end = datetime.now(
        timezone.utc
    )

    minutes = int(
        (wait_end - wait_start).total_seconds()
        / 60
    )

    fare = calculate_final_fare(
        ride["distanceKm"],
        ride["vehicleType"],
        minutes
    )

    ride_ref.update({

        "status":
            "in_progress_return",

        "waitEndTime":
            wait_end,

        "waitTimeMinutes":
            minutes,

        "waitCharge":
            fare["waitCharge"],

        "finalFare":
            fare["finalFare"]
    })

    return {
        "success": True,
        "minutes": minutes,
        "charge": fare["waitCharge"]
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

@router.post("/update-wait-time")
def update_wait_time(data: dict):

    ride_ref = db.collection("rides").document(
        data["rideId"]
    )

    minutes = data["minutes"]

    charge = calculate_wait_charge(
        minutes
    )

    ride_ref.update({
        "waitTimeMinutes": minutes,
        "waitCharge": charge
    })

    return {
        "success": True,
        "waitCharge": charge
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