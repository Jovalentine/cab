import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyANaZ0SagULToIfJz8qvwA5SMymgWrl03k",
  authDomain: "ai-document-summerize.firebaseapp.com",
  projectId: "ai-document-summerize",
  storageBucket: "ai-document-summerize.firebasestorage.app",
  messagingSenderId: "736826882807",
  appId: "1:736826882807:web:6414f994427d997357f1f2",
  measurementId: "G-BT77D9T1NQ"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);