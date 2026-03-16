import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDaGSb5c3CxKYWMWYNtlTierKJ1czFv7eE",
  authDomain: "auth.betterleaf.co",
  projectId: "gen-lang-client-0559569917",
  storageBucket: "gen-lang-client-0559569917.firebasestorage.app",
  messagingSenderId: "496548848546",
  appId: "1:496548848546:web:04ae571fbd21d5a047c8fb",
  measurementId: "G-LJLSHX9PBD"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
