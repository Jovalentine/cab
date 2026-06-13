"use client";

import { useEffect, useState } from "react";

import axios from "axios";
import dynamic from "next/dynamic";

import {
  useMap
} from "react-leaflet";

import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where
} from "firebase/firestore";

import polyline from "@mapbox/polyline";

import { db } from "@/lib/firebase";

import useAuth from "@/hooks/useAuth";

const MapContainer = dynamic(
  () =>
    import("react-leaflet").then(
      (mod) => mod.MapContainer
    ),
  { ssr: false }
);

const TileLayer = dynamic(
  () =>
    import("react-leaflet").then(
      (mod) => mod.TileLayer
    ),
  { ssr: false }
);

const Marker = dynamic(
  () =>
    import("react-leaflet").then(
      (mod) => mod.Marker
    ),
  { ssr: false }
);

const Popup = dynamic(
  () =>
    import("react-leaflet").then(
      (mod) => mod.Popup
    ),
  { ssr: false }
);

const Polyline = dynamic(
  () =>
    import("react-leaflet").then(
      (mod) => mod.Polyline
    ),
  { ssr: false }
);

const createIcons = async () => {
  const L = await import("leaflet");

  return {
    carIcon: new L.Icon({
      iconUrl: "/car.svg",
      iconSize: [42, 42],
      iconAnchor: [21, 42]
    }),
    pickupIcon: new L.Icon({
      iconUrl: "/pickup.svg",
      iconSize: [42, 42],
      iconAnchor: [21, 42]
    }),
    destinationIcon: new L.Icon({
      iconUrl: "/destination.svg",
      iconSize: [42, 42],
      iconAnchor: [21, 42]
    }),
  };
};

function FollowDriver({
  position
}: {
  position: {
    lat: number;
    lng: number;
  };
}) {

  const map = useMap();

  useEffect(() => {

    map.panTo(
      [
        position.lat,
        position.lng
      ],
      {
        animate: true,
      }
    );

  }, [position, map]);

  return null;
}

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

  const [
    eta,
    setEta
  ] = useState("");

  const [
    remainingDistance,
    setRemainingDistance
  ] = useState("");

  const [
    progressPercent,
    setProgressPercent
  ] = useState(0);

  const [
    routeCoordinates,
    setRouteCoordinates
  ] = useState<
    [number, number][]
  >([]);

  const [icons, setIcons] =
    useState<any>(null);

  useEffect(() => {
    createIcons().then(setIcons);
  }, []);

  // Driver Ride Listener
  useEffect(() => {

    if (userData) {

      setOnline(
        userData.online || false
      );

    }

  }, [userData]);

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
      collection(db, "rides")
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

              // RIDE MUST BE SEARCHING OR SCHEDULED
              if (
                ride.status !== "searching" &&
                ride.status !== "scheduled"
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

  // ROUTE POLYLINE + ETA + REMAINING DISTANCE
  const getRoutePolyline =
    async (
      originLat: number,
      originLng: number,
      destLat: number,
      destLng: number
    ) => {

      try {

           const response =
           await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/rides/route-data`,
                {
                  originLat,
                  originLng,
                  destLat,
                  destLng
                }
              );

            const data =
              response.data;

        console.log(
          "ROUTE DATA",
          JSON.stringify(
            data.routes?.[0],
            null,
            2
          )
        );

        console.log(
          "ROUTE LEG",
          JSON.stringify(
            data.routes?.[0]?.legs?.[0],
            null,
            2
          )
        );

        if (
          data.routes?.[0]?.legs?.[0]
        ) {

          const durationSeconds =
            data.routes[0]
            .legs[0]
            .duration;

          const mins =
            Math.ceil(
              durationSeconds / 60
            );

          setEta(
            `${mins} mins`
          );

          const distanceMeters =
            data.routes[0]
            .legs[0]
            .distance;

          const distanceKm =
            (
              distanceMeters / 1000
            ).toFixed(1);

          setRemainingDistance(
            `${distanceKm} km`
          );

          if (
            activeRide?.distanceKm
          ) {

            const progress =
              (
                (
                  activeRide.distanceKm -
                  Number(distanceKm)
                ) /
                activeRide.distanceKm
              ) * 100;

            setProgressPercent(
              Math.max(
                0,
                Math.min(
                  100,
                  Math.round(progress)
                )
              )
            );
          }

          if (
            data.routes[0]?.overview_polyline
          ) {

            const decoded =
              polyline.decode(
                data.routes[0].overview_polyline
              );

            const coordinates =
              decoded.map(
                ([lat, lng]) => [lat, lng]
              );

            setRouteCoordinates(
              coordinates
            );
          }
        }

      } catch (error) {

        console.log(
          "ROUTE ERROR:",
          error
        );
      }
    };

  // FETCH ROUTE WHEN ACTIVE RIDE EXISTS
  useEffect(() => {

    if (
      !activeRide ||
      !userData?.currentLocation
    ) return;

    if (
      activeRide.status === "accepted" ||
      activeRide.status === "arrived"
    ) {

      // NAVIGATE TO PICKUP
      getRoutePolyline(
        userData.currentLocation.lat,
        userData.currentLocation.lng,
        activeRide.pickup.lat,
        activeRide.pickup.lng
      );

    } else if (
      activeRide.status === "in_progress"
    ) {

      // NAVIGATE TO DESTINATION
      getRoutePolyline(
        userData.currentLocation.lat,
        userData.currentLocation.lng,
        activeRide.destination.lat,
        activeRide.destination.lng
      );
    }

 }, [
  activeRide,
  userData?.currentLocation
]);

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

  // Reserve Scheduled Ride
  const reserveRide =
    async (
      rideId: string
    ) => {

      try {

        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/rides/reserve`,
          {
            rideId,
            driverId:
              userData.uid
          }
        );

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

        setEnteredOtp("");

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

            {/* NAVIGATION CARD */}
            {
              eta && (

                <div className="
                  bg-black
                  text-white
                  p-5
                  rounded-2xl
                  mb-4
                  w-full
                ">

                  <h2 className="
                    text-xl
                    font-bold
                  ">

                    🚕 Current Trip

                  </h2>

                  <p className="mt-3">
                    {
                      activeRide.status === "accepted" ||
                      activeRide.status === "arrived"
                        ? `📍 Pickup ETA: ${eta}`
                        : `🏁 Destination ETA: ${eta}`
                    }
                  </p>

                  <p className="mt-2">
                    Remaining:
                    {" "}
                    {remainingDistance}
                  </p>

                  <p className="mt-2">

                    Status:

                    <span
                      className={`
                        ml-2
                        px-3
                        py-1
                        rounded-full
                        text-sm
                        ${
                          activeRide.status ===
                          "accepted"

                            ? "bg-blue-500"

                          : activeRide.status ===
                            "arrived"

                            ? "bg-yellow-500"

                          : activeRide.status ===
                            "in_progress"

                            ? "bg-green-600"

                            : "bg-gray-500"
                        }
                      `}
                    >

                      {activeRide.status}

                    </span>

                  </p>

                  {
                    activeRide.status ===
                    "in_progress" && (

                      <div className="
                        mt-4
                      ">

                        <p className="
                          mb-2
                          font-semibold
                        ">

                          Ride Progress

                        </p>

                        <div className="
                          w-full
                          h-3
                          bg-gray-700
                          rounded-full
                          overflow-hidden
                        ">

                          <div
                            className="
                              h-full
                              bg-green-400
                              transition-all
                              duration-500
                            "
                            style={{
                              width:
                                `${progressPercent}%`
                            }}
                          />

                        </div>

                        <p className="
                          mt-2
                          text-sm
                        ">

                          {progressPercent}% Complete

                        </p>

                      </div>

                    )
                  }

                </div>

              )
            }

            {/* DRIVER MAP */}
            {
              userData?.currentLocation &&
              icons && (

                <div
                  className="
                    h-[500px]
                    mt-6
                    rounded-2xl
                    overflow-hidden
                    w-full
                  "
                >

                  <MapContainer
                    center={[
                      userData.currentLocation.lat,
                      userData.currentLocation.lng
                    ]}
                    zoom={14}
                    style={{
                      height: "100%",
                      width: "100%"
                    }}
                  >

                    <FollowDriver
                      position={
                        userData.currentLocation
                      }
                    />

                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />

                    {/* DRIVER */}
                    <Marker
                      position={[
                        userData.currentLocation.lat,
                        userData.currentLocation.lng
                      ]}
                      icon={icons.carIcon}
                    >
                      <Popup>
                        Your Location
                      </Popup>
                    </Marker>

                    {/* PICKUP */}
                    <Marker
                      position={[
                        activeRide.pickup.lat,
                        activeRide.pickup.lng
                      ]}
                      icon={icons.pickupIcon}
                    >
                      <Popup>
                        Pickup
                      </Popup>
                    </Marker>

                    {/* DESTINATION */}
                    {
                          activeRide.status ===
                          "in_progress" && (

                            <Marker
                              position={[
                                activeRide.destination.lat,
                                activeRide.destination.lng
                              ]}
                              icon={icons.destinationIcon}
                            >
                              <Popup>
                                Destination
                              </Popup>
                            </Marker>

                          )
              }

                    {/* ROUTE */}
                    {
                      routeCoordinates.length > 0 && (
                        <Polyline
                          positions={routeCoordinates}
                          color={
                            activeRide.status ===
                            "in_progress"
                              ? "#22c55e"
                              : "#3b82f6"
                          }
                          weight={7}
                        />
                      )
                    }

                  </MapContainer>

                </div>

              )
            }
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

                {
                  ride.rideType ===
                  "scheduled" && (

                    <div className="
                      bg-blue-100
                      text-blue-700
                      px-3
                      py-1
                      rounded-full
                      inline-block
                      text-sm
                      mb-2
                    ">
                      📅 Scheduled Ride
                    </div>

                  )
                }

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

                {
                  ride.rideType ===
                  "scheduled" && (

                    <div className="mt-2">

                      <p>
                        Date:
                        {" "}
                        {ride.pickupDate}
                      </p>

                      <p>
                        Time:
                        {" "}
                        {ride.pickupTime}
                      </p>

                    </div>

                  )
                }

                {
                  ride.rideType ===
                  "scheduled"
                    ? (
                        <button
                          onClick={() =>
                            reserveRide(
                              ride.rideId
                            )
                          }
                          className="
                            mt-4
                            bg-blue-600
                            text-white
                            px-5
                            py-3
                            rounded-xl
                          "
                        >

                          Reserve Ride

                        </button>
                      )
                    : (
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
                      )
                }

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