"use client";

import { useEffect, useState } from "react";

import {
  collection,
  onSnapshot,
  query,
  where
} from "firebase/firestore";

import { db } from "@/lib/firebase";

import useAuth from "@/hooks/useAuth";

export default function AdminDashboard() {

  const { userData, loading } = useAuth();

  const [stats, setStats] =
    useState({
      totalDrivers: 0,
      onlineDrivers: 0,
      activeRides: 0,
      completedRides: 0,
      cancelledRides: 0,
      totalCustomers: 0
    });

  useEffect(() => {

    // Drivers
    const driversQuery = query(
      collection(db, "users"),
      where("role", "==", "driver")
    );

    const unsubscribeDrivers =
      onSnapshot(
        driversQuery,
        (snapshot) => {

          const drivers =
            snapshot.docs.map(
              (doc) => doc.data()
            );

          const onlineDrivers =
            drivers.filter(
              (driver) =>
                driver.online
            );

          setStats((prev) => ({
            ...prev,

            totalDrivers:
              drivers.length,

            onlineDrivers:
              onlineDrivers.length
          }));
        }
      );

    // Customers
    const customersQuery = query(
      collection(db, "users"),
      where(
        "role",
        "==",
        "customer"
      )
    );

    const unsubscribeCustomers =
      onSnapshot(
        customersQuery,
        (snapshot) => {

          setStats((prev) => ({
            ...prev,

            totalCustomers:
              snapshot.size
          }));
        }
      );

    // Rides
    const ridesQuery = query(
      collection(db, "rides")
    );

    const unsubscribeRides =
      onSnapshot(
        ridesQuery,
        (snapshot) => {

          const rides =
            snapshot.docs.map(
              (doc) => doc.data()
            );

          const active =
            rides.filter(
              (ride) =>
                ![
                  "completed",
                  "cancelled"
                ].includes(
                  ride.status
                )
            );

          const completed =
            rides.filter(
              (ride) =>
                ride.status ===
                "completed"
            );

          const cancelled =
            rides.filter(
              (ride) =>
                ride.status ===
                "cancelled"
            );

          setStats((prev) => ({
            ...prev,

            activeRides:
              active.length,

            completedRides:
              completed.length,

            cancelledRides:
              cancelled.length
          }));
        }
      );

    return () => {

      unsubscribeDrivers();

      unsubscribeCustomers();

      unsubscribeRides();
    };

  }, []);

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

        Admin Dashboard

      </h1>

      <div className="
        grid
        grid-cols-1
        md:grid-cols-3
        gap-6
      ">

        <DashboardCard
          title="Total Drivers"
          value={
            stats.totalDrivers
          }
        />

        <DashboardCard
          title="Online Drivers"
          value={
            stats.onlineDrivers
          }
        />

        <DashboardCard
          title="Customers"
          value={
            stats.totalCustomers
          }
        />

        <DashboardCard
          title="Active Rides"
          value={
            stats.activeRides
          }
        />

        <DashboardCard
          title="Completed Rides"
          value={
            stats.completedRides
          }
        />

        <DashboardCard
          title="Cancelled Rides"
          value={
            stats.cancelledRides
          }
        />

      </div>

    </div>
  );
}


function DashboardCard({
  title,
  value
}: {
  title: string;
  value: number;
}) {

  return (

    <div className="
      bg-white
      p-6
      rounded-2xl
      shadow
    ">

      <h2 className="
        text-xl
        font-semibold
      ">

        {title}

      </h2>

      <p className="
        text-4xl
        mt-4
        font-bold
      ">

        {value}

      </p>

    </div>
  );
}