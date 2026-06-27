from datetime import datetime

VEHICLE_PRICING = {
    "mini": {
        "base": 50,
        "per_km": 12
    },

    "sedan": {
        "base": 80,
        "per_km": 15
    },

    "suv": {
        "base": 120,
        "per_km": 18
    },

    "suv_xl": {
        "base": 180,
        "per_km": 22
    }
}


def calculate_fare(
    distance_km: float,
    vehicle_type: str
):

    pricing = VEHICLE_PRICING.get(
        vehicle_type,
        VEHICLE_PRICING["mini"]
    )

    base_fare = pricing["base"]

    distance_fare = (
        distance_km *
        pricing["per_km"]
    )

    subtotal = (
        base_fare +
        distance_fare
    )

    multiplier = get_time_multiplier()

    total_fare = round(
        subtotal * multiplier
    )

    surge_charge = round(
        total_fare - subtotal
    )

    return {

        "baseFare":
            round(base_fare),

        "distanceFare":
            round(distance_fare),

        "surgeCharge":
            surge_charge,

        "timeMultiplier":
            multiplier,

        "estimatedFare":
            total_fare
    }

def get_time_multiplier():

    hour = datetime.now().hour

    # Morning
    if 5 <= hour < 11:
        return 1.0

    # Afternoon
    elif 11 <= hour < 17:
        return 1.1

    # Evening Peak
    elif 17 <= hour < 22:
        return 1.3

    # Night
    else:
        return 1.5

def calculate_wait_charge(
    minutes: int
):

    free_minutes = 15

    if minutes <= free_minutes:
        return 0

    chargeable = minutes - free_minutes

    return chargeable * 2

def calculate_final_fare(
    distance_km: float,
    vehicle_type: str,
    wait_minutes: int = 0
):

    fare = calculate_fare(
        distance_km,
        vehicle_type
    )

    wait_charge = calculate_wait_charge(
        wait_minutes
    )

    return {

        "baseFare":
            fare["baseFare"],

        "distanceFare":
            fare["distanceFare"],

        "surgeCharge":
            fare["surgeCharge"],

        "timeMultiplier":
            fare["timeMultiplier"],

        "estimatedFare":
            fare["estimatedFare"],

        "waitCharge":
            wait_charge,

        "finalFare":
            fare["estimatedFare"] + wait_charge
    }