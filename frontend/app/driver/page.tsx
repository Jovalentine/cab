"use client";

import { useEffect, useState } from "react";

import axios from "axios";

import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where
} from "firebase/firestore";

import { db } from "@/lib/firebase";

import useAuth from "@/hooks/useAuth";

export default function DriverDashboard() {

  const { userData, loading } = useAuth();

  const [online,
    setOnline] = useState(false);

  const [availableRides,
    setAvailableRides] =
      useState<any[]>([]);

  const [activeRide,
    setActiveRide] =
      useState<any>(null);

  const [rideHistory,
    setRideHistory] =
      useState<any[]>([]);

  // STEP 5: Added enteredOtp state
  const [
    enteredOtp,
    setEnteredOtp
  ] = useState("");

  // Driver Ride Listener
  useEffect(() => {

    if (!userData?.uid) return;

    const q = query(
      collection(db, "rides"),
      where(
        "driverId",
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
              ].includes(
                ride.status
              )
          );

        setActiveRide(current || null);

        // Ride History
        const history =
          rides.filter(
            (ride) =>
              [
                "completed",
                "cancelled"
              ].includes(
                ride.status
              )
          );

        setRideHistory(history);

      });

    return () => unsubscribe();

  }, [userData]);

  // AVAILABLE RIDES REALTIME
  useEffect(() => {

    if (!online) return;

    const ridesQuery = query(
      collection(db, "rides"),
      where(
        "status",
        "==",
        "searching"
      )
    );

    const unsubscribe =
      onSnapshot(
        ridesQuery,
        (snapshot) => {

          const rides: any[] = [];

          snapshot.forEach((docSnap) => {

            rides.push({
              id: docSnap.id,
              ...docSnap.data()
            });

          });

          const availableRides =
            rides.filter((ride) => {

              // RIDE MUST BE SEARCHING
              if (
                ride.status !== "searching"
              ) {
                return false;
              }

              // ANY VEHICLE
              if (
                ride.vehicleType === "any"
              ) {
                return true;
              }

              // MATCH VEHICLE TYPE
              return (
                ride.vehicleType ===
                userData?.vehicleType
              );
            });

          setAvailableRides(availableRides);

        }
      );

    return () => unsubscribe();

  }, [online]);

  // Toggle Online
  const toggleOnline =
    async () => {

      try {

        const newStatus =
          !online;

        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/drivers/status`,
          {
            driverId:
              userData.uid,

            online:
              newStatus,

            available:
              newStatus
          }
        );

        // Update Firestore
        const userRef =
          doc(
            db,
            "users",
            userData.uid
          );

        await updateDoc(
          userRef,
          {
            online:
              newStatus,

            available:
              newStatus
          }
        );

        setOnline(newStatus);

      } catch (error) {

        console.log(error);
      }
    };

  // LIVE DRIVER LOCATION
  useEffect(() => {

    // ONLY WHEN ONLINE
    if (!online) return;

    const watchId =
      navigator.geolocation.watchPosition(

        async (position) => {

          try {

            const lat =
              position.coords.latitude;

            const lng =
              position.coords.longitude;

            console.log(
              "DRIVER LOCATION:",
              lat,
              lng
            );

            // UPDATE FIRESTORE
            const driverRef =
              doc(
                db,
                "users",
                userData.uid
              );

            await updateDoc(
              driverRef,
              {
                currentLocation: {
                  lat,
                  lng
                }
              }
            );

          } catch (error) {

            console.log(error);
          }

        },

        (error) => {

          console.log(error);
        },

        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 5000
        }

      );

    return () => {

      navigator.geolocation.clearWatch(
        watchId
      );
    };

  }, [online]);

  // Accept Ride
  const acceptRide =
    async (rideId: string) => {

      try {

        // UPDATE RIDE
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/rides/accept`,
          {
            rideId,

            driverId:
              userData.uid
          }
        );

        // DRIVER BUSY
        const driverRef =
          doc(
            db,
            "users",
            userData.uid
          );

        await updateDoc(
          driverRef,
          {
            available: false
          }
        );

        // CLEAR AVAILABLE RIDES
        setAvailableRides([]);

      } catch (error) {

        console.log(error);
      }
    };

  // STEP 3: Added arrivedRide function
  const arrivedRide =
    async () => {

      if (!activeRide) return;

      try {

        await updateDoc(
          doc(
            db,
            "rides",
            activeRide.id
          ),
          {
            status: "arrived"
          }
        );

      } catch (error) {

        console.log(error);
      }
    };

  // STEP 6: Added verifyOtp function
  const verifyOtp =
    async () => {

      if (!activeRide) return;

      if (
        enteredOtp !==
        activeRide.otp
      ) {

        alert(
          "Invalid OTP"
        );

        return;
      }

      try {

        await updateDoc(
          doc(
            db,
            "rides",
            activeRide.id
          ),
          {
            status:
              "in_progress"
          }
        );

      } catch (error) {

        console.log(error);
      }
    };

  // Update Ride Status
  const updateRideStatus =
    async (
      status: string
    ) => {

      if (!activeRide) return;

      try {

        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/rides/update-status`,
          {
            rideId:
              activeRide.id,

            status
          }
        );

        // DRIVER AVAILABLE AGAIN
        if (
          status === "completed" ||
          status === "cancelled"
        ) {

          const driverRef =
            doc(
              db,
              "users",
              userData.uid
            );

          await updateDoc(
            driverRef,
            {
              available: true
            }
          );
        }

      } catch (error) {

        console.log(error);
      }
    };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!userData ||
      userData.role !== "driver") {

    return <div>Access Denied</div>;
  }

  return (

    <div className="
      min-h-screen
      bg-gray-100
      p-8
    ">

      <div className="
        flex
        items-center
        justify-between
        mb-8
      ">

        <h1 className="
          text-4xl
          font-bold
        ">

          Driver Dashboard

        </h1>

        <button
          onClick={toggleOnline}
          className={`
            px-5 py-3 rounded-xl text-white
            ${
              online
                ? "bg-green-600"
                : "bg-gray-500"
            }
          `}
        >

          {online
            ? "Online"
            : "Offline"}

        </button>

      </div>

      {/* ACTIVE RIDE */}

      {activeRide && (

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

          <div className="
            space-y-3
          ">

            <p>
              Pickup:
              {" "}
              {activeRide
                .pickup.address}
            </p>

            <p>
              Destination:
              {" "}
              {activeRide
                .destination.address}
            </p>

            <p>
              Distance:
              {" "}
              {activeRide
                .distanceKm} km
            </p>

            <p>
              Fare:
              {" "}
              ₹{
                activeRide
                .estimatedFare
              }
            </p>

            <p>
              Status:
              {" "}
              <span className="
                font-bold
              ">
                {
                  activeRide
                  .status
                }
              </span>
            </p>

          </div>

          <div className="
            mt-6
            flex
            gap-3
            flex-wrap
          ">

            {/* STEP 7: Replaced active status action handlers */}
            {activeRide.status ===
              "accepted" && (

              <button
                onClick={arrivedRide}
                className="
                  bg-yellow-500
                  text-white
                  px-5
                  py-3
                  rounded-xl
                "
              >

                Arrived

              </button>

            )}

            {activeRide.status ===
              "arrived" && (

              <div className="
                flex
                flex-col
                gap-4
                w-full
              ">

                <input
                  type="text"
                  placeholder="Enter OTP"
                  value={enteredOtp}
                  onChange={(e) =>
                    setEnteredOtp(
                      e.target.value
                    )
                  }
                  className="
                    border
                    p-4
                    rounded-xl
                  "
                />

                <button
                  onClick={verifyOtp}
                  className="
                    bg-green-600
                    text-white
                    px-5
                    py-3
                    rounded-xl
                  "
                >

                  Start Ride

                </button>

              </div>

            )}

            {activeRide.status ===
              "in_progress" && (

              <button
                onClick={() =>
                  updateRideStatus(
                    "completed"
                  )
                }
                className="
                  bg-black
                  text-white
                  px-5
                  py-3
                  rounded-xl
                "
              >

                Complete Ride

              </button>

            )}

          </div>

        </div>

      )}

      {/* AVAILABLE RIDES */}

      {online && !activeRide && (

        <div className="mt-10">

          <h2 className="
            text-2xl
            font-semibold
            mb-5
          ">

            Available Rides

          </h2>

          <div className="
            space-y-4
          ">

            {availableRides.map(
              (ride) => (

              <div
                key={ride.rideId}
                className="
                  bg-white
                  p-5
                  rounded-xl
                  shadow
                "
              >

                <p>
                  {
                    ride.pickup
                    .address
                  }
                  {" → "}
                  {
                    ride.destination
                    .address
                  }
                </p>

                <p className="
                  mt-2
                ">
                  ₹{
                    ride
                    .estimatedFare
                  }
                </p>

                <p className="
                  mt-2
                  text-sm
                  text-gray-600
                ">
                  Vehicle:
                  {" "}
                  <span className="
                    capitalize
                    font-semibold
                  ">
                    {
                      ride.vehicleType
                    }
                  </span>
                </p>

                <button
                  onClick={() =>
                    acceptRide(
                      ride.rideId
                    )
                  }
                  className="
                    mt-4
                    bg-black
                    text-white
                    px-5
                    py-3
                    rounded-xl
                  "
                >

                  Accept Ride

                </button>

              </div>

            ))}

          </div>

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

        <div className="
          space-y-4
        ">

          {rideHistory.map(
            (ride) => (

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
                {
                  ride.pickup
                  .address
                }
                {" → "}
                {
                  ride.destination
                  .address
                }
              </p>

              <p className="
                mt-2
              ">
                ₹{
                  ride
                  .estimatedFare
                }
              </p>

              <p className="
                mt-1
              ">
                {
                  ride.status
                }
              </p>

            </div>

          ))}

        </div>

      </div>

    </div>
  );
}