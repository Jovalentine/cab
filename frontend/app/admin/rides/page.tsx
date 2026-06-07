"use client";

import { useEffect, useState } from "react";

import {
  collection,
  onSnapshot,
  orderBy,
  query
} from "firebase/firestore";

import { db } from "@/lib/firebase";

import useAuth from "@/hooks/useAuth";

export default function RideManagement() {

  const { userData, loading } =
    useAuth();

  const [rides, setRides] =
    useState<any[]>([]);

  const [filter, setFilter] =
    useState("all");

  // REALTIME RIDE LISTENER
  useEffect(() => {

    const q = query(
      collection(db, "rides"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe =
      onSnapshot(q, (snapshot) => {

        const data: any[] = [];

        snapshot.forEach((docSnap) => {

          data.push({
            id: docSnap.id,
            ...docSnap.data()
          });

        });

        setRides(data);

      });

    return () => unsubscribe();

  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!userData ||
      userData.role !== "admin") {

    return <div>Access Denied</div>;
  }

  // FILTER RIDES
  const filteredRides =
    filter === "all"
      ? rides
      : rides.filter(
          (ride) =>
            ride.status === filter
        );

  return (

    <div className="
      min-h-screen
      bg-gray-100
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

          Ride Monitoring

        </h1>

        <select
          value={filter}
          onChange={(e) =>
            setFilter(
              e.target.value
            )
          }
          className="
            px-4
            py-2
            rounded-xl
            border
          "
        >

          <option value="all">
            All Rides
          </option>

          <option value="searching">
            Searching
          </option>

          <option value="accepted">
            Accepted
          </option>

          <option value="arriving">
            Arriving
          </option>

          <option value="ongoing">
            Ongoing
          </option>

          <option value="completed">
            Completed
          </option>

          <option value="cancelled">
            Cancelled
          </option>

        </select>

      </div>

      {/* RIDES */}

      <div className="
        space-y-5
      ">

        {filteredRides.map(
          (ride) => (

          <div
            key={ride.id}
            className="
              bg-white
              p-6
              rounded-2xl
              shadow
            "
          >

            <div className="
              flex
              items-center
              justify-between
            ">

              {/* LEFT */}

              <div>

                <h2 className="
                  text-2xl
                  font-semibold
                ">

                  {
                    ride.pickup
                    ?.address
                  }

                  {" → "}

                  {
                    ride.destination
                    ?.address
                  }

                </h2>

                <p className="
                  mt-3
                  text-gray-600
                ">

                  Customer:
                  {" "}
                  {
                    ride.customerId
                  }

                </p>

                <p className="
                  text-gray-600
                ">

                  Driver:
                  {" "}

                  {
                    ride.driverId ||
                    "Not Assigned"
                  }

                </p>

                <div className="
                  mt-4
                  flex
                  gap-5
                  flex-wrap
                ">

                  <p>

                    Distance:
                    {" "}

                    {
                      ride.distanceKm
                    } km

                  </p>

                  <p>

                    Fare:
                    {" "}

                    ₹{
                      ride
                      .estimatedFare
                    }

                  </p>

                </div>

              </div>

              {/* RIGHT */}

              <div className="
                flex
                flex-col
                items-end
                gap-3
              ">

                <span
                  className="
                    bg-black
                    text-white
                    px-4
                    py-2
                    rounded-full
                    text-sm
                  "
                >

                  {
                    ride.status
                  }

                </span>

                {/* ACTIVE BADGE */}

                {![
                  "completed",
                  "cancelled"
                ].includes(
                  ride.status
                ) && (

                  <span
                    className="
                      bg-green-100
                      text-green-700
                      px-4
                      py-2
                      rounded-full
                      text-sm
                    "
                  >

                    Active Ride

                  </span>

                )}

              </div>

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}