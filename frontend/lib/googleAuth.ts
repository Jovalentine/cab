import {
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";

import { auth } from "@/lib/firebase";

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();

  return await signInWithPopup(
    auth,
    provider
  );
}