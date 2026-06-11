import os
import requests
from dotenv import load_dotenv

load_dotenv()

OLA_API_KEY = os.getenv("OLA_API_KEY")

def calculate_distance(origin_lat, origin_lng, dest_lat, dest_lng):
    url = "https://api.olamaps.io/routing/v1/directions"

    params = {
        "origin": f"{origin_lat},{origin_lng}",
        "destination": f"{dest_lat},{dest_lng}",
        "api_key": OLA_API_KEY 
    }

    headers = {
        "X-Request-Id": "rides-cancel-tracking",
        "Content-Type": "application/json"
    }

    try:
        # Added timeout=10 to prevent backend hanging indefinitely
        response = requests.post(
            url,
            params=params,
            headers=headers,
            timeout=10
        )
        response.raise_for_status() # Optional: Raises an HTTPError for bad responses (4xx or 5xx)
        data = response.json()
    except requests.exceptions.Timeout:
        print("OLA API Error: Request timed out after 10 seconds.")
        return 0
    except requests.exceptions.RequestException as e:
        print(f"OLA API Error: Connection failed. Details: {e}")
        return 0

    print("OLA ROUTING RESPONSE:", data)

    # SAFETY
    if "routes" not in data or len(data["routes"]) == 0:
        return 0

    route = data["routes"][0]
    distance_meters = 0

    if "legs" in route and len(route["legs"]) > 0:
        distance_meters = route["legs"][0].get("distance", 0)
    elif "distance" in route:
        distance_meters = route["distance"]
    elif "summary" in route and "distance" in route["summary"]:
        distance_meters = route["summary"]["distance"]

    print("DISTANCE METERS:", distance_meters)

    if not distance_meters:
        return 0

    distance_km = distance_meters / 1000
    return round(distance_km, 1)


def get_route_data(
    origin_lat,
    origin_lng,
    dest_lat,
    dest_lng
):

    url = (
        "https://api.olamaps.io/routing/v1/directions"
    )

    params = {
        "origin":
            f"{origin_lat},{origin_lng}",

        "destination":
            f"{dest_lat},{dest_lng}",

        "api_key":
            OLA_API_KEY
    }

    response = requests.post(
        url,
        params=params
    )

    return response.json()