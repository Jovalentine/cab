def calculate_fare(
    distance_km: float
):

    # BASE FARE
    base_fare = 80

    # PER KM RATE
    per_km_rate = 18

    # DISTANCE CHARGE
    distance_charge = (
        distance_km *
        per_km_rate
    )

    # TOTAL
    total_fare = (
        base_fare +
        distance_charge
    )

    return round(total_fare)