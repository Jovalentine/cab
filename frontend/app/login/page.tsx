"use client";

import { auth, db } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const googleLogin = async () => {
    try {
      setLoading(true);

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      // 1. If user doesn't exist, create their default customer record in Firestore
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          role: "customer",
          createdAt: new Date()
        });
      }

      // 2. Determine the core access role
      const role = userSnap.exists() 
        ? userSnap.data().role 
        : "customer";

      // STEP 3 — Save Role After Login to localStorage for route layouts to reference
      localStorage.setItem("role", role);
      console.log("ROLE PERSISTED:", role);

      // 3. Dynamic Client-Side Router Redirection
      if (role === "admin") {
        router.push("/admin");
      } else if (role === "driver") {
        router.push("/driver");
      } else {
        router.push("/customer");
      }

    } catch (error) {
      console.error("Login failed unexpectedly:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="bg-white border border-gray-200 p-8 rounded-xl shadow-sm w-96">
        <h1 className="text-2xl font-bold mb-5 text-gray-900 tracking-tight">
          Local Cab Login
        </h1>

        <button
          onClick={googleLogin}
          disabled={loading}
          className={`w-full py-3 rounded-lg text-white font-medium transition-colors duration-150 ${
            loading 
              ? "bg-gray-400 cursor-not-allowed" 
              : "bg-black hover:bg-gray-800 shadow-sm"
          }`}
        >
          {loading ? "Establishing identity..." : "Continue with Google"}
        </button>
      </div>
    </div>
  );
}