"use client";

import { useEffect, useState } from "react";

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

interface Driver {
  id: string;
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: "driver" | "pending_driver" | "admin" | "customer";
  blocked?: boolean;
  status?: string;
  [key: string]: unknown;
}

interface Ride {
  id: string;
  driverId: string;
  customerId: string;
  status: string;
  pickup: string;
  drop: string;
  fare: number;
  [key: string]: unknown;
}

export default function DriversManagement() {

  const { userData, loading } =
    useAuth();

  const [drivers, setDrivers] =
    useState<Driver[]>([]);

  const [rides, setRides] =
    useState<Ride[]>([]);

  // REALTIME DRIVERS
  useEffect(() => {

    const driversQuery = query(
      collection(db, "users"),
      where(
        "role",
        "in",
        [
          "driver",
          "pending_driver"
        ]
      )
    );

    const unsubscribeDrivers =
      onSnapshot(
        driversQuery,
        (snapshot) => {

          const data: Driver[] = [];

          snapshot.forEach((docSnap) => {

            data.push({
              id: docSnap.id,
              ...docSnap.data()
            } as Driver);

          });

          setDrivers(data);

        }
      );

    // REALTIME RIDES
    const ridesQuery = query(
      collection(db, "rides")
    );

    const unsubscribeRides =
      onSnapshot(
        ridesQuery,
        (snapshot) => {

          const ridesData: Ride[] = [];

          snapshot.forEach((docSnap) => {

            ridesData.push({
              id: docSnap.id,
              ...docSnap.data()
            } as Ride);

          });

          setRides(ridesData);

        }
      );

    return () => {

      unsubscribeDrivers();

      unsubscribeRides();
    };

  }, []);

  // APPROVE DRIVER
  const approveDriver =
    async (id: string) => {

      const driverRef =
        doc(db, "users", id);

      await updateDoc(
        driverRef,
        {
          role: "driver"
        }
      );
    };

  // BLOCK DRIVER
  const blockDriver =
    async (id: string) => {

      const driverRef =
        doc(db, "users", id);

      await updateDoc(
        driverRef,
        {
          blocked: true
        }
      );
    };

  // UNBLOCK DRIVER
  const unblockDriver =
    async (id: string) => {

      const driverRef =
        doc(db, "users", id);

      await updateDoc(
        driverRef,
        {
          blocked: false
        }
      );
    };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!userData ||
      userData.role !== "admin") {

    return <div>Access Denied</div>;
  }

  return (

    <div className="
      min-h-screen
      bg-gray-100
    ">

      <h1 className="
        text-4xl
        font-bold
        mb-8
      ">

        Driver Management

      </h1>

      <div className="
        space-y-5
      ">

        {drivers.map((driver) => {

          // DRIVER RIDES
          const driverRides =
            rides.filter(
              (ride) =>
                ride.driverId ===
                driver.id
            );

          // ACTIVE RIDE
          const activeRide =
            driverRides.find(
              (ride) =>
                ![
                  "completed",
                  "cancelled"
                ].includes(
                  ride.status
                )
            );

          return (

            <div
              key={driver.id}
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

                    {driver.name}

                  </h2>

                  <p className="
                    text-gray-600
                  ">

                    {driver.email}

                  </p>

                  <p className="
                    mt-3
                    text-xs
                    break-all
                  ">

                    UID:
                    {" "}
                    {driver.uid}

                  </p>

                  {/* BADGES */}

                  <div className="
                    mt-4
                    flex
                    gap-3
                    flex-wrap
                  ">

                    <span className="
                      bg-gray-200
                      px-3
                      py-1
                      rounded-full
                      text-sm
                    ">

                      {driver.role}

                    </span>

                    <span className={`
                      px-3 py-1 rounded-full text-sm
                      ${
                        driver.online
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-200 text-gray-700"
                      }
                    `}>

                      {
                        driver.online
                          ? "Online"
                          : "Offline"
                      }

                    </span>

                    {driver.blocked && (

                      <span className="
                        bg-red-100
                        text-red-700
                        px-3
                        py-1
                        rounded-full
                        text-sm
                      ">

                        Blocked

                      </span>

                    )}

                    {activeRide && (

                      <span className="
                        bg-blue-100
                        text-blue-700
                        px-3
                        py-1
                        rounded-full
                        text-sm
                      ">

                        Active Ride

                      </span>

                    )}

                  </div>

                  {/* STATS */}

                  <div className="
                    mt-5
                    flex
                    gap-5
                    flex-wrap
                  ">

                    <p>

                      Total Rides:
                      {" "}
                      {
                        driverRides.length
                      }

                    </p>

                    <p>

                      Completed:
                      {" "}
                      {
                        driverRides.filter(
                          (ride) =>
                            ride.status ===
                            "completed"
                        ).length
                      }

                    </p>

                  </div>

                  {/* ACTIVE RIDE */}

                  {activeRide && (

                    <div className="
                      mt-5
                      bg-gray-100
                      p-4
                      rounded-xl
                    ">

                      <p className="
                        font-semibold
                        mb-2
                      ">

                        Current Ride

                      </p>

                      <p>

                        {
                          activeRide
                          .pickup
                          ?.address
                        }

                        {" → "}

                        {
                          activeRide
                          .destination
                          ?.address
                        }

                      </p>

                      <p className="
                        mt-2
                      ">

                        ₹{
                          activeRide
                          .estimatedFare
                        }

                      </p>

                      <p className="
                        mt-1
                      ">

                        Status:
                        {" "}
                        {
                          activeRide
                          .status
                        }

                      </p>

                    </div>

                  )}

                </div>

                {/* RIGHT */}

                <div className="
                  flex
                  flex-col
                  gap-3
                ">

                  {driver.role ===
                    "pending_driver" && (

                    <button
                      onClick={() =>
                        approveDriver(
                          driver.id
                        )
                      }
                      className="
                        bg-black
                        text-white
                        px-4
                        py-2
                        rounded-xl
                      "
                    >

                      Approve

                    </button>

                  )}

                  {!driver.blocked ? (

                    <button
                      onClick={() =>
                        blockDriver(
                          driver.id
                        )
                      }
                      className="
                        bg-red-500
                        text-white
                        px-4
                        py-2
                        rounded-xl
                      "
                    >

                      Block

                    </button>

                  ) : (

                    <button
                      onClick={() =>
                        unblockDriver(
                          driver.id
                        )
                      }
                      className="
                        bg-green-500
                        text-white
                        px-4
                        py-2
                        rounded-xl
                      "
                    >

                      Unblock

                    </button>

                  )}

                </div>

              </div>

            </div>

          );
        })}

      </div>

    </div>
  );
}