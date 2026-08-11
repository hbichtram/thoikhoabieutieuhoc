import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyCT9I5_kpJdTtNDNd590AODKe4eLG-FGQI",
  authDomain: "tkbtieuhoc.firebaseapp.com",
  projectId: "tkbtieuhoc",
  storageBucket: "tkbtieuhoc.firebasestorage.app",
  messagingSenderId: "246328817975",
  appId: "1:246328817975:web:96ae847bf213b604b402b2",
};

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore Database & Auth
export const db = getFirestore(app);
export const auth = getAuth(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

export async function loginWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    console.log("[FIREBASE AUTH] uid =", result.user.uid, "email =", result.user.email);
    return result.user;
  } catch (error) {
    console.error("[FIREBASE AUTH] Google Login Error:", error);
    throw error;
  }
}

export async function logoutFirebase(): Promise<void> {
  try {
    await signOut(auth);
    console.log("[FIREBASE AUTH] Signed out successfully");
  } catch (error) {
    console.error("[FIREBASE AUTH] Logout Error:", error);
  }
}

export function subscribeAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("[FIREBASE AUTH] uid =", user.uid, "email =", user.email);
    } else {
      console.log("[FIREBASE AUTH] Firebase Authentication chưa xác định được người dùng.");
    }
    callback(user);
  });
}

/**
 * Single diagnostic helper wrapper for all Firestore write operations
 */
export async function performWriteDiagnostic(
  operation: "setDoc" | "updateDoc" | "deleteDoc" | "addDoc",
  collectionName: string,
  docId: string,
  writeFn: () => Promise<void>,
  dataSummary?: any
): Promise<boolean> {
  const currentUser = auth.currentUser;
  const authUid = currentUser?.uid || "UNAUTHENTICATED";
  const fullPath = `${collectionName}/${docId}`;

  console.log("[FIRESTORE WRITE START]", {
    operation,
    collection: collectionName,
    document: docId,
    fullPath,
    uid: docId.includes("/") ? docId.split("/")[0] : docId,
    authUid,
    data: dataSummary,
  });

  try {
    await writeFn();
    console.log("[FIRESTORE WRITE SUCCESS]", {
      operation,
      fullPath,
      authUid,
    });
    return true;
  } catch (error: any) {
    console.error("[FIRESTORE WRITE FAILED]", {
      operation,
      fullPath,
      uid: docId.includes("/") ? docId.split("/")[0] : docId,
      authUid,
      "error.code": error?.code || "unknown",
      "error.message": error?.message || String(error),
      error,
    });
    throw error;
  }
}

/**
 * Save data payload to Firestore under timetable_data/{uid}_{key}
 */
export async function saveToFirebase(key: string, data: any, customUid?: string): Promise<boolean> {
  const uid = customUid || auth.currentUser?.uid;
  if (!uid) {
    console.warn("[FIREBASE AUTH] Firebase Authentication chưa xác định được người dùng. Không thể ghi Firestore.");
    return false;
  }

  const docId = `${uid}_${key}`;
  const docRef = doc(db, "timetable_data", docId);

  return await performWriteDiagnostic(
    "setDoc",
    "timetable_data",
    docId,
    async () => {
      await setDoc(docRef, { payload: JSON.stringify(data), updatedAt: new Date().toISOString() });
    },
    { key, dataLength: JSON.stringify(data).length }
  );
}

/**
 * Load data payload from Firestore
 */
export async function loadFromFirebase<T>(key: string, customUid?: string): Promise<T | null> {
  const uid = customUid || auth.currentUser?.uid;
  if (!uid) {
    console.warn("[FIREBASE AUTH] Firebase Authentication chưa xác định được người dùng.");
    return null;
  }

  try {
    const docRef = doc(db, "timetable_data", `${uid}_${key}`);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && data.payload) {
        return JSON.parse(data.payload) as T;
      }
    }
    return null;
  } catch (error) {
    console.error(`[FIRESTORE] READ ERROR for timetable_data/${uid}_${key}:`, error);
    return null;
  }
}

import { normalizeTeacher } from "../utils/teacherUtils";

/**
 * Validates teacher data for any undefined fields before writing to Firestore.
 */
export function validateTeacherData(teacher: any): void {
  console.log("[FIRESTORE] Teacher payload:", teacher);

  const undefinedFields = Object.entries(teacher)
    .filter(([_, value]) => value === undefined)
    .map(([key]) => key);

  if (undefinedFields.length > 0) {
    console.error(`[FIRESTORE VALIDATION ERROR] Undefined fields in teacher (${teacher.name || teacher.id}):`, undefinedFields);
    throw new Error(
      `Teacher data contains undefined fields: ${undefinedFields.join(", ")}`
    );
  }
}

/**
 * Save complete full state to Firestore paths:
 * 1) teachers/{uid}
 * 2) weeklySchedules/{uid}
 * 3) timetable_data/{uid}
 */
export async function saveFullStateToFirestore(fullData: {
  teachers: any[];
  classes: any[];
  subjects: any[];
  assignments: any[];
  timeConfig: any;
  cells: any[];
  versions: any[];
}, customUid?: string): Promise<boolean> {
  const uid = customUid || auth.currentUser?.uid;

  console.log("[AUTH CHECK]", {
    isAuthenticated: !!auth.currentUser,
    uid: uid,
    email: auth.currentUser?.email
  });

  if (!uid) {
    console.warn("[FIREBASE AUTH] Firebase Authentication chưa xác định được người dùng. Bỏ qua ghi Firestore.");
    return false;
  }

  const updatedAt = new Date().toISOString();

  // 1. Normalize and validate teachers array to ensure 100% no undefined values
  const normalizedTeachers = (fullData.teachers || []).map((t) => normalizeTeacher(t));
  normalizedTeachers.forEach((t) => validateTeacherData(t));

  const cleanFullData = {
    ...fullData,
    teachers: normalizedTeachers,
  };

  const payloadStr = JSON.stringify(cleanFullData);

  // 1) Write to teachers/{uid}
  const teacherDocRef = doc(db, "teachers", uid);
  await performWriteDiagnostic(
    "setDoc",
    "teachers",
    uid,
    async () => {
      await setDoc(teacherDocRef, {
        teachers: normalizedTeachers,
        updatedAt,
      }, { merge: true });
    },
    { teachersCount: normalizedTeachers.length }
  );

  // 2) Write to weeklySchedules/{uid}
  const scheduleDocRef = doc(db, "weeklySchedules", uid);
  await performWriteDiagnostic(
    "setDoc",
    "weeklySchedules",
    uid,
    async () => {
      await setDoc(scheduleDocRef, {
        cells: cleanFullData.cells,
        timeConfig: cleanFullData.timeConfig,
        updatedAt,
      }, { merge: true });
    },
    { cellsCount: cleanFullData.cells.length }
  );

  // 3) Write full data bundle to timetable_data/{uid}
  const dataDocRef = doc(db, "timetable_data", uid);
  await performWriteDiagnostic(
    "setDoc",
    "timetable_data",
    uid,
    async () => {
      await setDoc(dataDocRef, {
        payload: payloadStr,
        teachersCount: normalizedTeachers.length,
        assignmentsCount: cleanFullData.assignments.length,
        updatedAt,
      });
    },
    { payloadSize: payloadStr.length }
  );

  return true;
}

/**
 * Load full state from Firestore path timetable_data/{uid} or teachers/{uid}
 */
export async function loadFullStateFromFirestore(customUid?: string) {
  const uid = customUid || auth.currentUser?.uid;
  console.log("[AUTH CHECK]", {
    isAuthenticated: !!auth.currentUser,
    uid: uid,
    email: auth.currentUser?.email
  });

  if (!uid) {
    console.warn("[FIREBASE AUTH] Firebase Authentication chưa xác định được người dùng.");
    return null;
  }

  const dataPath = `timetable_data/${uid}`;
  try {
    console.log("[FIRESTORE READ PATH]", dataPath);
    const dataDocRef = doc(db, "timetable_data", uid);
    const snap = await getDoc(dataDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && data.payload) {
        console.log(`[FIRESTORE] READ SUCCESS: ${dataPath}`);
        return JSON.parse(data.payload);
      }
    }
    return null;
  } catch (error: any) {
    console.error("[FIRESTORE ERROR]", {
      code: error?.code,
      message: error?.message,
      path: dataPath,
      uid
    });
    return null;
  }
}

/**
 * Save a timetable version to teachers/{uid}/timetableVersions/{versionId}
 */
export async function saveTimetableVersionToFirestore(version: any, customUid?: string): Promise<boolean> {
  const uid = customUid || auth.currentUser?.uid;
  console.log("[AUTH CHECK]", {
    isAuthenticated: !!auth.currentUser,
    uid: uid,
    email: auth.currentUser?.email
  });

  if (!uid) {
    console.warn("[FIREBASE AUTH] Firebase Authentication chưa xác định được người dùng.");
    return false;
  }

  const versionRef = doc(db, "teachers", uid, "timetableVersions", version.id);
  const docId = `${uid}/timetableVersions/${version.id}`;

  return await performWriteDiagnostic(
    "setDoc",
    "teachers",
    docId,
    async () => {
      await setDoc(versionRef, {
        ...version,
        updatedAt: new Date().toISOString(),
      });
    },
    { versionId: version.id, name: version.name }
  );
}

/**
 * Delete a timetable version from teachers/{uid}/timetableVersions/{versionId}
 */
export async function deleteTimetableVersionFromFirestore(versionId: string, customUid?: string): Promise<boolean> {
  const uid = customUid || auth.currentUser?.uid;
  console.log("[AUTH CHECK]", {
    isAuthenticated: !!auth.currentUser,
    uid: uid,
    email: auth.currentUser?.email
  });

  if (!uid) {
    console.warn("[FIREBASE AUTH] Firebase Authentication chưa xác định được người dùng.");
    return false;
  }

  const versionRef = doc(db, "teachers", uid, "timetableVersions", versionId);
  const docId = `${uid}/timetableVersions/${versionId}`;

  return await performWriteDiagnostic(
    "deleteDoc",
    "teachers",
    docId,
    async () => {
      await deleteDoc(versionRef);
    }
  );
}
