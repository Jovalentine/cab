from datetime import datetime

from app.firebase import db


def activate_reserved_rides():

    rides = (
        db.collection("rides")
        .where("status", "==", "reserved")
        .stream()
    )

    now = datetime.now()

    for ride in rides:

        data = ride.to_dict()

        if (
            not data.get("pickupDate") or
            not data.get("pickupTime")
        ):
            continue

        scheduled = datetime.strptime(
            f"{data['pickupDate']} {data['pickupTime']}",
            "%Y-%m-%d %H:%M"
        )

        if scheduled <= now:

            ride.reference.update({
                "driverId":
                    data["reservedDriverId"],
                    
                "reservedDriverId": None,

                "status":
                    "accepted"
            })