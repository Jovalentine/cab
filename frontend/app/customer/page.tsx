"use client";

import { useEffect, useState } from "react";

import axios from "axios";

import {
  collection,
  onSnapshot,
  query,
  where
} from "firebase/firestore";

import { db } from "@/lib/firebase";

import useAuth from "@/hooks/useAuth";

export default function CustomerDashboard() {

  const { userData, loading } = useAuth();

  const [destination,
    setDestination] = useState("");

  const [vehicleType,
    setVehicleType] =
    useState("any");

  const [suggestions,
    setSuggestions] = useState([]);

  const [selectedPlace,
    setSelectedPlace] = useState(null);

  const [currentLocation,
    setCurrentLocation] =
    useState(null);

  const [activeRide,
    setActiveRide] = useState<any>(null);

  const [rideHistory,
    setRideHistory] = useState<any[]>([]);

  const [driverData,
    setDriverData] =
    useState(null);

  // GET USER LOCATION
  useEffect(() => {

    navigator.geolocation.getCurrentPosition(

      (position) => {

        setCurrentLocation({
          lat:
            position.coords.latitude,

          lng:
            position.coords.longitude
        });

      },

      (error) => {

        console.log(error);
      }

    );

  }, []);

  // Realtime Listener
  useEffect(() => {

    if (!userData?.uid) return;

    const q = query(
      collection(db, "rides"),
      where(
        "customerId",
        "==",
        userData.uid
      )
    );

    const unsubscribe =
      onSnapshot(q, (snapshot) => {

        const rides: any[] = [];

        snapshot.forEach((doc) => {

          rides.push({
            id: doc.id,
            ...doc.data()
          });

        });

        // Active Ride
        const current =
          rides.find(
            (ride) =>
              ![
                "completed",
                "cancelled"
              ].includes(ride.status)
          );

        setActiveRide(current || null);

        // Ride History
        const history =
          rides.filter(
            (ride) =>
              [
                "completed",
                "cancelled"
              ].includes(ride.status)
          );

        setRideHistory(history);

      });

    return () => unsubscribe();

  }, [userData]);

  // DRIVER REALTIME LISTENER
  useEffect(() => {

    if (!activeRide?.driverId) {

      setDriverData(null);

      return;
    }

    const driverQuery = query(
      collection(db, "users"),
      where(
        "uid",
        "==",
        activeRide.driverId
      )
    );

    const unsubscribe =
      onSnapshot(
        driverQuery,
        (snapshot) => {

          snapshot.forEach((doc) => {

            setDriverData({
              id: doc.id,
              ...doc.data()
            });

          });

        }
      );

    return () => unsubscribe();

  }, [activeRide]);

  // SEARCH DESTINATIONS
  const searchPlaces =
    async (value: string) => {

      setDestination(value);

      if (!value) {

        setSuggestions([]);

        return;
      }

      try {

        const response =
          await fetch(

`https://api.olamaps.io/places/v1/autocomplete?input=${value}&api_key=${process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY}`

          );

        const data =
          await response.json();

        console.log(
          "AUTOCOMPLETE:",
          data
        );

        setSuggestions(
          data.predictions || []
        );

      } catch (error) {

        console.log(error);
      }
    };

  // GEOCODE DESTINATION ADDRESS
  const getDestinationCoordinates =
    async () => {

      try {

        const response =
          await fetch(

`https://api.olamaps.io/places/v1/geocode?address=${encodeURIComponent(destination)}&api_key=${process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY}`

          );

        const data =
          await response.json();

        console.log(
          "GEOCODE RESPONSE:",
          data
        );

        // SAFE CHECK
        if (
          !data.geocodingResults ||
          data.geocodingResults.length === 0
        ) {

          return null;
        }

        const location =
          data.geocodingResults[0]
          .geometry.location;

        return {
          lat: location.lat,
          lng: location.lng
        };

      } catch (error) {

        console.log(
          "GEOCODE ERROR:",
          error
        );

        return null;
      }
    };

  // CALCULATE REAL DISTANCE
const calculateDistance =
  async () => {

    // SAFETY CHECK
    if (!currentLocation) {

      alert(
        "Location not available"
      );

      return 0;
    }

    try {

      // GET DESTINATION COORDS
      const destinationCoords =
        await getDestinationCoordinates();

      if (!destinationCoords) {

        console.log(
          "Destination coordinates not found"
        );

        return 0;
      }

      // DIRECTIONS API
      const response =
        await axios.post(

`${process.env.NEXT_PUBLIC_API_URL}/rides/calculate-distance`,

{
  originLat:
    currentLocation.lat,

  originLng:
    currentLocation.lng,

  destLat:
    destinationCoords.lat,

  destLng:
    destinationCoords.lng
}
);

      const distanceKm =
        response.data.distanceKm;

      console.log(
        "DISTANCE RESPONSE:",
        distanceKm
      );

      return distanceKm;

    } catch (error) {

      console.log(
        "DISTANCE ERROR:",
        error
      );

      return 0;
    }
  };
  // Create Ride
  const createRide =
    async () => {

      if (!destination) {
        alert("Enter destination");
        return;
      }

      try {

        // TEMP STATIC DATA
        // Later from Ola Maps API

        const pickup = {
          address:
            "Current Location"
        };

        const destinationData = {
          address: destination
        };

        // CALCULATE REAL DISTANCE
        const distanceKm =
          await calculateDistance();

        // FARE CALCULATION
        const fareRes =
        await axios.post(
         `${process.env.NEXT_PUBLIC_API_URL}/rides/estimate-fare`,
         {
            distanceKm
          }
          );

const estimatedFare =
  fareRes.data
    .estimatedFare;

        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/rides/create`,
          {
            customerId: userData.uid,

            pickup,

            destination:
              destinationData,

            distanceKm,

            estimatedFare,

            vehicleType:
              vehicleType
          }
        );

        setDestination("");

      } catch (error) {

        console.log(error);

        alert("Ride creation failed");
      }
    };

  // Cancel Ride
  const cancelRide =
    async () => {

      if (!activeRide) return;

      try {

        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/rides/cancel`,
          {
            rideId: activeRide.id
          }
        );

      } catch (error) {

        console.log(error);
      }
    };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!userData ||
      userData.role !== "customer") {

    return <div>Access Denied</div>;
  }

  return (

    <div className="
      min-h-screen
      bg-gray-100
      p-8
    ">

      <h1 className="
        text-4xl
        font-bold
        mb-8
      ">

        Customer Dashboard

      </h1>

      {/* ACTIVE RIDE */}

      {activeRide ? (

        <div className="
          bg-white
          p-6
          rounded-2xl
          shadow
          max-w-2xl
        ">

          <h2 className="
            text-2xl
            font-semibold
            mb-5
          ">

            Current Ride

          </h2>

          <div className="space-y-3">

            <p>
              Pickup:
              {" "}
              {activeRide.pickup.address}
            </p>

            <p>
              Destination:
              {" "}
              {activeRide.destination.address}
            </p>

            <p>
              Distance:
              {" "}
              {activeRide.distanceKm} km
            </p>

            <p>
              Fare:
              {" "}
              ₹{activeRide.estimatedFare}
            </p>

            <p>
              Status:
              {" "}
              <span className={`
                font-bold
                ${
                  activeRide.status === "searching"
                    ? "text-yellow-600"
                    : activeRide.status === "accepted"
                    ? "text-blue-600"
                    : activeRide.status === "arriving"
                    ? "text-purple-600"
                    : activeRide.status === "ongoing"
                    ? "text-green-600"
                    : ""
                }
              `}>
                {activeRide.status}
              </span>
            </p>

            <p>
              Driver:
              {" "}
              {
                driverData
                  ? driverData.name
                  : "Searching..."
              }
            </p>

            <p>
              Vehicle:
              {" "}
              <span className="capitalize">
                {activeRide.vehicleType}
              </span>
            </p>

          </div>

          <button
            onClick={cancelRide}
            className="
              mt-5
              bg-red-500
              text-white
              px-5
              py-3
              rounded-xl
            "
          >

            Cancel Ride

          </button>

        </div>

      ) : (

        // BOOK RIDE

        <div className="
          bg-white
          p-6
          rounded-2xl
          shadow
          max-w-xl
        ">

          <h2 className="
            text-2xl
            font-semibold
            mb-5
          ">

            Book Ride

          </h2>

          <input
            type="text"
            placeholder="Destination"
            value={destination}
            onChange={(e) =>
              searchPlaces(
                e.target.value
              )
            }
            className="
              w-full
              border
              px-4
              py-3
              rounded-xl
            "
          />

          {/* SUGGESTIONS */}

          {
            suggestions.length > 0 && (

              <div className="
                bg-white
                border
                border-gray-300
                rounded-xl
                mt-2
                max-h-64
                overflow-y-auto
              ">

                {
                  suggestions.map(
                    (place, index) => (

                      <div
                        key={index}
                        onClick={() => {

                          setDestination(
                            place.description
                          );

                          setSelectedPlace(
                            place
                          );

                          setSuggestions([]);
                        }}
                        className="
                          px-4
                          py-3
                          hover:bg-gray-100
                          cursor-pointer
                        "
                      >

                        {
                          place.description
                        }

                      </div>

                    )
                  )
                }

              </div>

            )
          }

          <div className="
            mt-5
            bg-gray-100
            p-4
            rounded-xl
          ">

            <p>
              Estimated Distance:
              25 km
            </p>

            <p className="mt-2">

              Estimated Fare:
              ₹530

            </p>

          </div>

          <div className="mt-5">
            <h3 className="
              font-semibold
              mb-3
            ">
              Select Vehicle
            </h3>

            <div className="
              grid
              grid-cols-2
              gap-3
            ">

              <button
                onClick={() =>
                  setVehicleType("any")
                }
                className={`
                  p-3
                  rounded-xl
                  border
                  ${
                    vehicleType === "any"
                      ? "bg-black text-white"
                      : "bg-white"
                  }
                `}
              >
                Any
              </button>

              <button
                onClick={() =>
                  setVehicleType("mini")
                }
                className={`
                  p-3
                  rounded-xl
                  border
                  ${
                    vehicleType === "mini"
                      ? "bg-black text-white"
                      : "bg-white"
                  }
                `}
              >
                Mini
              </button>

              <button
                onClick={() =>
                  setVehicleType("sedan")
                }
                className={`
                  p-3
                  rounded-xl
                  border
                  ${
                    vehicleType === "sedan"
                      ? "bg-black text-white"
                      : "bg-white"
                  }
                `}
              >
                Sedan
              </button>

              <button
                onClick={() =>
                  setVehicleType("suv")
                }
                className={`
                  p-3
                  rounded-xl
                  border
                  ${
                    vehicleType === "suv"
                      ? "bg-black text-white"
                      : "bg-white"
                  }
                `}
              >
                SUV
              </button>

            </div>

          </div>

          <button
            onClick={createRide}
            className="
              mt-5
              bg-black
              text-white
              px-5
              py-3
              rounded-xl
              w-full
            "
          >

            Confirm Booking

          </button>

        </div>

      )}

      {/* RIDE HISTORY */}

      <div className="mt-10">

        <h2 className="
          text-2xl
          font-semibold
          mb-5
        ">

          Ride History

        </h2>

        <div className="space-y-4">

          {rideHistory.map((ride) => (

            <div
              key={ride.id}
              className="
                bg-white
                p-5
                rounded-xl
                shadow
              "
            >

              <p>
                {ride.pickup.address}
                {" → "}
                {ride.destination.address}
              </p>

              <p className="mt-2">
                ₹{ride.estimatedFare}
              </p>

              <p className="mt-1">
                {ride.status}
              </p>

            </div>

          ))}

        </div>

      </div>

    </div>
  );
}