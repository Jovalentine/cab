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

    fare = (
        pricing["base"] +
        distance_km * pricing["per_km"]
    )

    return round(fare)

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

    base_fare = calculate_fare(
        distance_km,
        vehicle_type
    )

    wait_charge = calculate_wait_charge(
        wait_minutes
    )

    return {
        "baseFare": base_fare,
        "waitCharge": wait_charge,
        "finalFare": base_fare + wait_charge
    }