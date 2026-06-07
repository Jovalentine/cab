"use client";

import { useEffect, useState } from "react";

import { onAuthStateChanged } from "firebase/auth";

import {
    doc,
    getDoc
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

export default function useAuth() {

  const [userData, setUserData] = useState<any>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const unsubscribe = onAuthStateChanged(auth, async (user) => {

      if (!user) {
        setLoading(false);
        return;
      }

      const uid = user.uid;

      const userRef = doc(db, "users", uid);

      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {

        setUserData({
          uid,
          ...userSnap.data()
        });
      }

      setLoading(false);

    });

    return () => unsubscribe();

  }, []);

  return {
    userData,
    loading
  };
}