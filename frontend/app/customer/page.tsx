"use client";

import axios from "axios";
import dynamic from "next/dynamic";
import {
  useEffect,
  useState
} from "react";

import {
  useMap
} from "react-leaflet";

import polyline from "@mapbox/polyline";
import {
  collection,
  onSnapshot,
  query,
  where
} from "firebase/firestore";

import { db } from "@/lib/firebase";

import useAuth from "@/hooks/useAuth";

const MapContainer = dynamic(
  () =>
    import("react-leaflet").then(
      (mod) => mod.MapContainer
    ),
  {
    ssr: false
  }
);

const TileLayer = dynamic(
  () =>
    import("react-leaflet").then(
      (mod) => mod.TileLayer
    ),
  {
    ssr: false
  }
);

const Marker = dynamic(
  () =>
    import("react-leaflet").then(
      (mod) => mod.Marker
    ),
  {
    ssr: false
  }
);

const Popup = dynamic(
  () =>
    import("react-leaflet").then(
      (mod) => mod.Popup
    ),
  {
    ssr: false
  }
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
      iconSize: [45, 45],
      iconAnchor: [22, 22],
    }),
    pickupIcon: new L.Icon({
      iconUrl: "/pickup.svg",
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    }),
    destinationIcon: new L.Icon({
      iconUrl: "/destination.svg",
      iconSize: [40, 40],
      iconAnchor: [20, 40],
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

export default function CustomerDashboard() {

  const { userData, loading } = useAuth();

  const [destination,
    setDestination] = useState("");

  const [pickupQuery, setPickupQuery] =
    useState("");

  const [pickupLocation,
    setPickupLocation] =
    useState<any>(null);

  const [pickupSuggestions,
    setPickupSuggestions] =
    useState<any[]>([]);

  const [
    useCurrentLocation,
    setUseCurrentLocation
  ] = useState(true);

  const [vehicleType,
    setVehicleType] =
    useState("any");

  const [
    rideType,
    setRideType
  ] = useState("now");

  const [
    pickupDate,
    setPickupDate
  ] = useState("");

  const [
    pickupTime,
    setPickupTime
  ] = useState("");

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

  const [icons, setIcons] =
    useState(null);

  const [
    animatedDriverPosition,
    setAnimatedDriverPosition
  ] = useState(null);

  const [
    routeCoordinates,
    setRouteCoordinates
  ] = useState<any[]>([]);

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

  useEffect(() => {
    createIcons().then(setIcons);
  }, []);

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

    const driverId =
      activeRide?.status === "reserved"
        ? activeRide?.reservedDriverId
        : activeRide?.driverId;

    if (!driverId) {

      setDriverData(null);

      return;
    }

    const driverQuery = query(
      collection(db, "users"),
      where(
        "uid",
        "==",
        driverId
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

  // SMOOTH DRIVER MOVEMENT
  useEffect(() => {
    if (
      !driverData?.currentLocation
    ) return;

    const targetLat =
      driverData.currentLocation.lat;

    const targetLng =
      driverData.currentLocation.lng;

    // FIRST LOAD
    if (!animatedDriverPosition) {
      setAnimatedDriverPosition({
        lat: targetLat,
        lng: targetLng
      });

      return;
    }

    const startLat =
      animatedDriverPosition.lat;

    const startLng =
      animatedDriverPosition.lng;

    const duration = 800;

    const frames = 30;

    let frame = 0;

    const interval =
      setInterval(() => {
        frame++;

        const progress =
          frame / frames;

        const lat =
          startLat +
          (
            targetLat -
            startLat
          ) * progress;

        const lng =
          startLng +
          (
            targetLng -
            startLng
          ) * progress;

        setAnimatedDriverPosition({
          lat,
          lng
        });

        if (frame >= frames) {
          clearInterval(interval);
        }
      }, duration / frames);

    return () =>
      clearInterval(interval);
  }, [driverData?.currentLocation]);

  useEffect(() => {

    if (
      !driverData?.currentLocation ||
      !activeRide?.destination
    ) return;

    if (
  activeRide.status ===
  "accepted" ||
  activeRide.status ===
  "arrived"
) {

  // DRIVER GOING TO CUSTOMER

  getRoutePolyline(
    driverData.currentLocation.lat,
    driverData.currentLocation.lng,

    activeRide.pickup.lat,
    activeRide.pickup.lng
  );

} else {

  
    // RIDE STARTED

    getRoutePolyline(
      driverData.currentLocation.lat,
      driverData.currentLocation.lng,

      activeRide.destination.lat,
      activeRide.destination.lng
    );
  }

    }, [
      driverData?.currentLocation,
      activeRide?.destination,
      activeRide?.pickup,
      activeRide?.status
    ]);

  // SEARCH PICKUP
  const searchPickup =
    async (query: string) => {

      if (!query) {

        setPickupSuggestions([]);
        return;
      }

      try {

        const response =
          await axios.get(
            "https://api.olamaps.io/places/v1/autocomplete",
            {
              params: {
                input: query,
                api_key:
                  process.env
                  .NEXT_PUBLIC_OLA_MAPS_API_KEY
              }
            }
          );

        setPickupSuggestions(
          response.data.predictions || []
        );

      } catch (error) {

        console.log(error);
      }
    };

  useEffect(() => {

    const timeout =
      setTimeout(() => {

        searchPickup(
          pickupQuery
        );

      }, 400);

    return () =>
      clearTimeout(timeout);

  }, [pickupQuery]);

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
                pickupLocation?.lat ??
                currentLocation.lat,

              originLng:
                pickupLocation?.lng ??
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

  // Route Polyline Fetch Logic
  const getRoutePolyline =
    async (
      originLat: any,
      originLng: any,
      destLat: any,
      destLng: any
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
          "ROUTE RESPONSE:",
          data
        );

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

        // IMPROVEMENT 1: Formatted ETA configuration calculations
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

          setEta(`${mins} mins`);

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

            const completedPercent =
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
                  Math.round(
                    completedPercent
                  )
                )
              )
            );
          }
        }

        if (
          !data.routes ||
          data.routes.length === 0
        ) {
          return;
        }

        const route =
          data.routes[0];

        const decoded =
          polyline.decode(
            route.overview_polyline
          );

        const coordinates =
          decoded.map(
            ([lat, lng]) => [lat, lng]
          );

        setRouteCoordinates(
          coordinates
        );

      } catch (error) {

        console.log(
          "ROUTE ERROR:",
          error
        );
      }
    };

  // Create Ride
  const createRide =
    async () => {

      if (!destination) {
        alert("Enter destination");
        return;
      }

      if (
        rideType ===
        "scheduled"
      ) {

        if (
          !pickupDate ||
          !pickupTime
        ) {

          alert(
            "Select date and time"
          );

          return;
        }

        const scheduledDateTime =
          new Date(
            `${pickupDate}T${pickupTime}`
          );

        if (
          scheduledDateTime <= new Date()
        ) {
          alert(
            "Please select a future date and time"
          );
          return;
        }
      }

      try {

        // GET DESTINATION COORDINATES
        const destinationCoords =
          await getDestinationCoordinates();

        if (!destinationCoords) {
          alert("Invalid destination");
          return;
        }

        const pickup = pickupLocation
          ? {
              address:
                pickupLocation.description,
              lat:
                pickupLocation.lat,
              lng:
                pickupLocation.lng
            }
          : {
              address:
                "Current Location",
              lat: currentLocation.lat,
              lng: currentLocation.lng
            };

        const destinationData = {
          address: destination,
          lat: destinationCoords.lat,
          lng: destinationCoords.lng
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
              vehicleType,

            rideType,

            pickupDate,

            pickupTime,

            otp:
              Math.floor(
                 1000 + Math.random() * 9000
                 ).toString(),
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
         // RESET MAP STATES
      setRouteCoordinates([]);

      setEta("");

      setAnimatedDriverPosition(
        null
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
                    : activeRide.status === "reserved"
                    ? "text-indigo-600"
                    : "text-purple-600"
                }
              `}>
                {
                  activeRide.status === "reserved"
                    ? "Reserved"
                    : activeRide.status
                }
              </span>
            </p>

            {
              activeRide.status ===
              "reserved" && (

                <div className="
                  mt-3
                  bg-indigo-50
                  border
                  border-indigo-200
                  rounded-xl
                  p-4
                ">

                  <p className="font-semibold">
                    📅 Scheduled Ride Reserved
                  </p>

                  <p className="mt-2">
                    Driver:
                    {" "}
                    {driverData?.name || "Assigning..."}
                  </p>

                  <p>
                    Date:
                    {" "}
                    {activeRide.pickupDate}
                  </p>

                  <p>
                    Time:
                    {" "}
                    {activeRide.pickupTime}
                  </p>

                </div>

              )
            }

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
                    bg-gray-700
                    rounded-full
                    h-3
                    overflow-hidden
                  ">

                    <div
                      className="
                        bg-green-400
                        h-full
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
            {activeRide.status ===
                "arrived" && (

                <div className="
                 mt-6
                 bg-black
                  text-white
                   p-6
                   rounded-2xl
                 ">

              <p className="
                 text-lg
                mb-2
                 ">
                      Share OTP with Driver
                </p>

                  <h1 className="
                    text-5xl
                    font-bold
                    tracking-widest
                  ">
                    {activeRide.otp}
                  </h1>

                </div>
                )}

            <p>
              Driver:
              {" "}
              {
                driverData
                  ? driverData.name
                  : "Searching..."
              }
            </p>

            {
                  eta && (

                    <div className="
                      mt-4
                      bg-black
                      text-white
                      p-5
                      rounded-2xl
                      shadow-lg
                      max-w-md
                    ">

                      <div className="
                        flex
                        justify-between
                        items-center
                      ">

                        <span className="
                          font-semibold
                        ">
                          🚗 Driver
                        </span>

                        <span>
                          {
                            driverData?.name ||
                            "Searching..."
                          }
                        </span>

                      </div>

                      <div className="
                        mt-3
                      ">

                        <p>

                          {
                            activeRide.status ===
                            "accepted" ||

                            activeRide.status ===
                            "arrived"

                              ? `⏱ Driver ETA: ${eta}`

                              : `🏁 Destination ETA: ${eta}`
                          }

                        </p>

                        <p className="mt-2">

                          📏 Remaining:
                          {" "}
                          {remainingDistance}

                        </p>

                        <p className="mt-2">

                          🚕 Vehicle:
                          {" "}
                          {
                            activeRide.vehicleType
                          }

                        </p>

                        <p className="mt-2">

                          Status:
                          {" "}
                          {
                            activeRide.status
                          }

                        </p>

                      </div>

                    </div>

                  )
           }

            {
              activeRide?.pickup?.lat &&
              activeRide?.destination?.lat &&
              icons && (
                <div className="mt-4 h-80 rounded-lg overflow-hidden shadow">
                  <MapContainer
                    center={[
                      animatedDriverPosition?.lat ||
                      activeRide.pickup.lat,
                      animatedDriverPosition?.lng ||
                      activeRide.pickup.lng
                    ]}
                    zoom={15}
                    style={{ height: "100%", width: "100%" }}
                  >
                    {
                      animatedDriverPosition && (

                        <FollowDriver
                          position={
                            animatedDriverPosition
                          }
                        />

                      )
                    }
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />

                    {/* DRIVER */}
                    {
                      animatedDriverPosition && (
                        <Marker
                          position={[
                            animatedDriverPosition.lat,
                            animatedDriverPosition.lng
                          ]}
                          icon={icons.carIcon}
                        >
                          <Popup>
                            🚗 Driver Live Location
                          </Popup>
                        </Marker>
                      )
                    }

                    {/* PICKUP */}
                    <Marker
                      position={[
                        activeRide.pickup.lat,
                        activeRide.pickup.lng
                      ]}
                      icon={icons.pickupIcon}
                    >
                      <Popup>
                        📍 Pickup
                      </Popup>
                    </Marker>

                    {/* DESTINATION */}
                    <Marker
                      position={[
                        activeRide.destination.lat,
                        activeRide.destination.lng
                      ]}
                      icon={icons.destinationIcon}
                    >
                      <Popup>
                        🏁 Destination
                      </Popup>
                    </Marker>

                    {
                      routeCoordinates.length > 0 && (
                        <Polyline
                          positions={routeCoordinates}
                          color="blue"
                          weight={6}
                        />
                      )
                    }
                  </MapContainer>
                </div>
              )
            }

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

          <h3 className="font-bold mb-2">
            Pickup Location
          </h3>

          <label className="
            flex
            items-center
            gap-2
            mb-3
          ">

            <input
              type="checkbox"
              checked={useCurrentLocation}
              onChange={(e) => {

                setUseCurrentLocation(
                  e.target.checked
                );

                if (e.target.checked) {

                  setPickupLocation(null);
                  setPickupQuery("");
                  setPickupSuggestions([]);
                }
              }}
            />

            <span>
              Use Current Location
            </span>

          </label>

          {
            !useCurrentLocation && (
              <>
                <input
                  type="text"
                  value={pickupQuery}
                  onChange={(e) =>
                    setPickupQuery(e.target.value)
                  }
                  placeholder="Enter pickup location"
                  className="
                    w-full
                    p-3
                    border
                    rounded-lg
                    mb-4
                  "
                />

                {
                  pickupSuggestions.map(
                    (item, index) => (

                      <div
                        key={index}
                        onClick={() => {

                          setPickupQuery(
                            item.description
                          );

                          setPickupLocation(
                            item
                          );

                          setPickupSuggestions(
                            []
                          );
                        }}
                        className="
                          p-2
                          border-b
                          cursor-pointer
                        "
                      >

                        {item.description}

                      </div>
                    )
                  )
                }
              </>
            )
          }

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
              Ride Type
            </h3>

            <div className="
              grid
              grid-cols-2
              gap-3
            ">

              <button
                onClick={() => {
                  setRideType("now");
                  setPickupDate("");
                  setPickupTime("");
                }}
                className={`
                  p-3
                  rounded-xl
                  border
                  ${
                    rideType === "now"
                      ? "bg-black text-white"
                      : "bg-white"
                  }
                `}
              >
                Ride Now
              </button>

              <button
                onClick={() =>
                  setRideType("scheduled")
                }
                className={`
                  p-3
                  rounded-xl
                  border
                  ${
                    rideType === "scheduled"
                      ? "bg-black text-white"
                      : "bg-white"
                  }
                `}
              >
                Schedule Ride
              </button>

            </div>

          </div>

          {
            rideType ===
            "scheduled" && (

              <div className="
                mt-4
                space-y-3
              ">

                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) =>
                    setPickupDate(
                      e.target.value
                    )
                  }
                  className="
                    w-full
                    p-3
                    border
                    rounded-xl
                  "
                />

                <input
                  type="time"
                  value={pickupTime}
                  onChange={(e) =>
                    setPickupTime(
                      e.target.value
                    )
                  }
                  className="
                    w-full
                    p-3
                    border
                    rounded-xl
                  "
                />

              </div>

            )
          }

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

          {
            rideType === "scheduled" &&
            pickupDate &&
            pickupTime && (

              <div className="
                mt-4
                bg-blue-50
                border
                border-blue-200
                p-4
                rounded-xl
              ">

                <p className="
                  font-semibold
                  mb-2
                ">
                  📅 Scheduled Ride
                </p>

                <p>
                  Date:{" "}
                  {
                    new Date(pickupDate)
                    .toLocaleDateString(
                      "en-GB",
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      }
                    )
                  }
                </p>

                <p className="mt-1">
                  Time:{" "}
                  {
                    new Date(
                      `${pickupDate}T${pickupTime}`
                    ).toLocaleTimeString(
                      "en-US",
                      {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true
                      }
                    )
                  }
                </p>

              </div>

            )
          }

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