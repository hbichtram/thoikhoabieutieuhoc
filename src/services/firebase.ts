import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
} from "firebase/firestore";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyCT9I5_kpJdTtNDNd590AODKe4eLG-FGQI",
  authDomain: "tkbtieuhoc.firebaseapp.com",
  projectId: "tkbtieuhoc",
  storageBucket: "tkbtieuhoc.firebasestorage.app",
  messagingSenderId: "246328817975",
  appId: "1:246328817975:web:96ae847bf213b604b402b2"
};

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore Database
export const db = getFirestore(app);

/**
 * Save data payload to Firestore under tkbtieuhoc dataset doc
 */
export async function saveToFirebase(key: string, data: any): Promise<boolean> {
  try {
    const docRef = doc(db, "timetable_data", key);
    await setDoc(docRef, { payload: JSON.stringify(data), updatedAt: new Date().toISOString() });
    return true;
  } catch (error) {
    console.warn(`[Firebase] Save to Firestore error for ${key}:`, error);
    return false;
  }
}

/**
 * Load data payload from Firestore
 */
export async function loadFromFirebase<T>(key: string): Promise<T | null> {
  try {
    const docRef = doc(db, "timetable_data", key);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && data.payload) {
        return JSON.parse(data.payload) as T;
      }
    }
    return null;
  } catch (error) {
    console.warn(`[Firebase] Load from Firestore error for ${key}:`, error);
    return null;
  }
}
