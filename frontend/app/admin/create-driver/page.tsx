"use client";

import { useState } from "react";

import {
  createUserWithEmailAndPassword
} from "firebase/auth";

import {
  doc,
  setDoc
} from "firebase/firestore";

import {
  auth,
  db
} from "@/lib/firebase";



export default function CreateDriverPage() {

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [vehicleName,
    setVehicleName] =
    useState("");

  const [vehicleNumber,
    setVehicleNumber] =
    useState("");

  const [vehicleType,
    setVehicleType] =
    useState("mini");

  const [licenseNumber,
    setLicenseNumber] =
    useState("");

  const [rcNumber,
    setRcNumber] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const createDriver =
    async () => {

      try {

        setLoading(true);

        // TEMP PASSWORD
        const tempPassword =
          "Driver@123";

        // CREATE AUTH USER
        const userCredential =
          await createUserWithEmailAndPassword(
            auth,
            email,
            tempPassword
          );

        const uid =
          userCredential.user.uid;

        // CREATE FIRESTORE USER
        await setDoc(
          doc(db, "users", uid),
          {
            uid,
            name,
            email,
            phone,

            role: "driver",

            online: false,

            blocked: false,

            vehicleName,

            vehicleNumber,

            vehicleType,

            licenseNumber,

            rcNumber,

            createdAt:
              serverTimestamp()
          }
        );

        alert(
          `Driver Created Successfully

Email:
${email}

Password:
${tempPassword}`
        );

        // RESET
        setName("");
        setEmail("");
        setPhone("");
        setVehicleName("");
        setVehicleNumber("");
        setLicenseNumber("");
        setRcNumber("");

      } catch (error: any) {

        console.log(error);

        alert(error.message);

      } finally {

        setLoading(false);

      }

    };

  return (

    <div className="min-h-screen bg-gray-100 p-8">

      <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow">

        <h1 className="text-4xl font-bold mb-8">
          Register Driver
        </h1>

        <div className="space-y-5">

          <input
            type="text"
            placeholder="Driver Name"
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            className="w-full p-4 rounded-xl border"
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            className="w-full p-4 rounded-xl border"
          />

          <input
            type="text"
            placeholder="Phone Number"
            value={phone}
            onChange={(e) =>
              setPhone(e.target.value)
            }
            className="w-full p-4 rounded-xl border"
          />

          <input
            type="text"
            placeholder="Vehicle Name"
            value={vehicleName}
            onChange={(e) =>
              setVehicleName(e.target.value)
            }
            className="w-full p-4 rounded-xl border"
          />

          <input
            type="text"
            placeholder="Vehicle Number"
            value={vehicleNumber}
            onChange={(e) =>
              setVehicleNumber(e.target.value)
            }
            className="w-full p-4 rounded-xl border"
          />

          <select
            value={vehicleType}
            onChange={(e) =>
              setVehicleType(
                e.target.value
              )
            }
            className="w-full p-4 rounded-xl border"
          >

            <option value="mini">
              🚗 Mini
            </option>

            <option value="sedan">
              🚘 Sedan
            </option>

            <option value="suv">
              🚙 SUV
            </option>
            <option value="suv_xl">
              🚐 SUV XL (7 Seats)
            </option>

          </select>

          <input
            type="text"
            placeholder="Driving License Number"
            value={licenseNumber}
            onChange={(e) =>
              setLicenseNumber(
                e.target.value
              )
            }
            className="w-full p-4 rounded-xl border"
          />

          <input
            type="text"
            placeholder="RC Number"
            value={rcNumber}
            onChange={(e) =>
              setRcNumber(
                e.target.value
              )
            }
            className="w-full p-4 rounded-xl border"
          />

          <button
            onClick={createDriver}
            disabled={loading}
            className="
              w-full
              bg-black
              text-white
              p-4
              rounded-xl
              text-lg
            "
          >

            {loading
              ? "Creating..."
              : "Create Driver"}

          </button>

        </div>

      </div>

    </div>
  );
}