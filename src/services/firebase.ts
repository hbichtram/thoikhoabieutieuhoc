import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { UserProfile, School, UserSummary } from "../types";

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

console.log("[FIREBASE CONFIG RUNTIME]", {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  appId: firebaseConfig.appId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
});

console.log("[FIREBASE APP]", {
  appName: app.name,
  appProjectId: app.options.projectId,
  authProjectId: auth.app.options.projectId,
  dbProjectId: db.app.options.projectId,
});

console.log("[DATABASE INSTANCE]", {
  databaseId: "(default)",
  projectId: db.app.options.projectId,
});

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

let requestCounter = 0;

/**
 * Single diagnostic helper wrapper for all Firestore write operations
 */
export async function performWriteDiagnostic(
  operation: "setDoc" | "updateDoc" | "deleteDoc" | "addDoc",
  collectionName: string,
  docId: string,
  writeFn: () => Promise<void>,
  dataSummary?: any,
  context: string = "UNKNOWN_CONTEXT"
): Promise<boolean> {
  const reqId = ++requestCounter;
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.warn(`[FIRESTORE REQUEST #${reqId} ABORTED] User unauthenticated.`, {
      requestId: reqId,
      context,
      collectionName,
      docId,
    });
    return false;
  }

  const authUid = currentUser.uid;
  const fullPath = `${collectionName}/${docId}`;

  console.log(`[FIRESTORE REQUEST #${reqId} START]
requestId: ${reqId}
context: ${context}
operation: ${operation}
fullPath: ${fullPath}
authUid: ${authUid}
authReady: true
projectId: ${firebaseConfig.projectId}
databaseId: (default)`, dataSummary || "");

  try {
    await writeFn();
    console.log(`[FIRESTORE REQUEST #${reqId} SUCCESS]
requestId: ${reqId}
context: ${context}
operation: ${operation}
fullPath: ${fullPath}
authUid: ${authUid}
authReady: true
projectId: ${firebaseConfig.projectId}
databaseId: (default)`);
    return true;
  } catch (error: any) {
    const errCode = error?.code || "unknown";
    const errMsg = error?.message || String(error);
    console.error(`[FIRESTORE REQUEST #${reqId} FAILED]
requestId: ${reqId}
context: ${context}
operation: ${operation}
fullPath: ${fullPath}
authUid: ${authUid}
authReady: true
projectId: ${firebaseConfig.projectId}
databaseId: (default)
error.code: ${errCode}
error.message: ${errMsg}`, error);
    console.trace(`[FIRESTORE REQUEST #${reqId} FAILED TRACE]`);
    throw error;
  }
}

/**
 * Save data payload to Firestore under timetable_data/{uid}_{key}
 */
export async function saveToFirebase(
  key: string,
  data: any,
  customUid?: string,
  context: string = "SAVE_TO_FIREBASE"
): Promise<boolean> {
  const currentUser = auth.currentUser;
  const uid = customUid || currentUser?.uid;
  if (!currentUser || !uid || currentUser.uid !== uid) {
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
    { key, dataLength: JSON.stringify(data).length },
    context
  );
}

/**
 * Load data payload from Firestore
 */
export async function loadFromFirebase<T>(key: string, customUid?: string): Promise<T | null> {
  const currentUser = auth.currentUser;
  const uid = customUid || currentUser?.uid;
  if (!currentUser || !uid || currentUser.uid !== uid) {
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
export async function saveFullStateToFirestore(
  fullData: {
    teachers: any[];
    classes: any[];
    subjects: any[];
    assignments: any[];
    timeConfig: any;
    cells: any[];
    versions: any[];
  },
  customUid?: string,
  context: string = "SAVE_FULL_STATE"
): Promise<boolean> {
  const currentUser = auth.currentUser;
  const uid = customUid || currentUser?.uid;

  if (!currentUser || !uid || currentUser.uid !== uid) {
    console.warn("[FIREBASE AUTH] Firebase Authentication chưa xác định được người dùng hoặc UID không khớp. Bỏ qua ghi Firestore.");
    return false;
  }

  console.log("[AUTH CHECK BEFORE WRITE]", {
    context,
    authReady: true,
    isAuthenticated: true,
    authUid: currentUser.uid,
    targetUid: uid,
    email: currentUser.email
  });

  const updatedAt = new Date().toISOString();

  // 1. Normalize and validate teachers array to ensure 100% no undefined values
  const normalizedTeachers = (fullData.teachers || []).map((t) => normalizeTeacher(t));
  normalizedTeachers.forEach((t) => validateTeacherData(t));

  const cleanFullData = {
    ...fullData,
    teachers: normalizedTeachers,
  };

  console.log(`[FIRESTORE SAVED] scheduleEntries.length: ${cleanFullData.cells ? cleanFullData.cells.length : 0}`);

  const payloadStr = JSON.stringify(cleanFullData);

  // Write full data bundle to timetable_data/{uid}
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
    { payloadSize: payloadStr.length },
    `${context} -> timetable_data`
  );

  return true;
}

/**
 * Load full state from Firestore path timetable_data/{uid}
 */
export async function loadFullStateFromFirestore(customUid?: string) {
  const reqId = ++requestCounter;
  const currentUser = auth.currentUser;
  const uid = customUid || currentUser?.uid;

  if (!currentUser || !uid || currentUser.uid !== uid) {
    console.warn(`[FIRESTORE REQUEST #${reqId} ABORTED] User unauthenticated or UID mismatch.`);
    return null;
  }

  const dataPath = `timetable_data/${uid}`;

  console.log("[AUTH BEFORE FIRESTORE]", {
    currentUser: !!currentUser,
    uid: currentUser.uid,
    email: currentUser.email,
    providerData: currentUser.providerData?.map(p => ({ providerId: p.providerId, uid: p.uid })),
  });

  console.log(`[FIRESTORE REQUEST #${reqId} START]
requestId: ${reqId}
context: LOAD_FULL_STATE
operation: getDoc
fullPath: ${dataPath}
authUid: ${currentUser.uid}
authReady: true
projectId: ${firebaseConfig.projectId}
databaseId: (default)`);

  try {
    const dataDocRef = doc(db, "timetable_data", uid);
    const snap = await getDoc(dataDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && data.payload) {
        console.log(`[FIRESTORE REQUEST #${reqId} SUCCESS]
requestId: ${reqId}
context: LOAD_FULL_STATE
operation: getDoc
fullPath: ${dataPath}
authUid: ${currentUser.uid}
authReady: true
projectId: ${firebaseConfig.projectId}
databaseId: (default)`);
        return JSON.parse(data.payload);
      }
    }
    console.log(`[FIRESTORE REQUEST #${reqId} SUCCESS] (Document not found)
requestId: ${reqId}
context: LOAD_FULL_STATE
operation: getDoc
fullPath: ${dataPath}
authUid: ${currentUser.uid}
authReady: true
projectId: ${firebaseConfig.projectId}
databaseId: (default)`);
    return null;
  } catch (error: any) {
    const errCode = error?.code || "unknown";
    const errMsg = error?.message || String(error);
    console.error(`[FIRESTORE REQUEST #${reqId} FAILED]
requestId: ${reqId}
context: LOAD_FULL_STATE
operation: getDoc
fullPath: ${dataPath}
authUid: ${currentUser.uid}
authReady: true
projectId: ${firebaseConfig.projectId}
databaseId: (default)
error.code: ${errCode}
error.message: ${errMsg}`, error);
    throw error;
  }
}

/**
 * Save a timetable version to teachers/{uid}/timetableVersions/{versionId}
 */
export async function saveTimetableVersionToFirestore(
  version: any,
  customUid?: string,
  context: string = "SAVE_TIMETABLE_VERSION"
): Promise<boolean> {
  const currentUser = auth.currentUser;
  const uid = customUid || currentUser?.uid;

  if (!currentUser || !uid || currentUser.uid !== uid) {
    console.warn("[FIREBASE AUTH] Firebase Authentication chưa xác định được người dùng hoặc UID không khớp.");
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
    { versionId: version.id, name: version.name },
    context
  );
}

/**
 * Delete a timetable version from teachers/{uid}/timetableVersions/{versionId}
 */
export async function deleteTimetableVersionFromFirestore(
  versionId: string,
  customUid?: string,
  context: string = "DELETE_TIMETABLE_VERSION"
): Promise<boolean> {
  const currentUser = auth.currentUser;
  const uid = customUid || currentUser?.uid;

  if (!currentUser || !uid || currentUser.uid !== uid) {
    console.warn("[FIREBASE AUTH] Firebase Authentication chưa xác định được người dùng hoặc UID không khớp.");
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
    },
    undefined,
    context
  );
}

export const ADMIN_EMAIL = "tram.ai.ctst@gmail.com";

export const DEFAULT_INITIAL_SCHOOLS: School[] = [
  {
    id: "school_001",
    name: "Trường Tiểu học Chu Văn An",
    code: "CVA",
    address: "Hà Nội",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "school_002",
    name: "Trường Tiểu học Nguyễn Du",
    code: "THND",
    address: "TP. Hồ Chí Minh",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Sync or create user profile in Firestore: users/{uid}
 */
export async function syncUserProfile(user: User): Promise<UserProfile> {
  const userDocRef = doc(db, "users", user.uid);
  const now = new Date().toISOString();
  const isDefaultAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  try {
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      // If user is designated default admin, ensure role is admin & active
      if (isDefaultAdmin && (data.role !== "admin" || data.status !== "active")) {
        const updated: UserProfile = {
          ...data,
          role: "admin",
          status: "active",
          schoolId: data.schoolId || "school_001",
          updatedAt: now,
        };
        await setDoc(userDocRef, updated, { merge: true });
        return updated;
      }
      return data;
    } else {
      // Create new profile
      const newProfile: UserProfile = {
        uid: user.uid,
        displayName: user.displayName || null,
        email: user.email || null,
        photoURL: user.photoURL || null,
        role: isDefaultAdmin ? "admin" : "manager",
        status: isDefaultAdmin ? "active" : "pending",
        schoolId: isDefaultAdmin ? "school_001" : null,
        schoolName: isDefaultAdmin ? "Trường Tiểu học Chu Văn An" : null,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(userDocRef, newProfile);
      console.log("[USER PROFILE] Created initial profile:", newProfile);
      return newProfile;
    }
  } catch (error) {
    console.error("[USER PROFILE] Error syncing profile:", error);
    // Fallback in-memory profile if Firestore throws permission or network error
    return {
      uid: user.uid,
      displayName: user.displayName || null,
      email: user.email || null,
      photoURL: user.photoURL || null,
      role: isDefaultAdmin ? "admin" : "manager",
      status: isDefaultAdmin ? "active" : "pending",
      schoolId: isDefaultAdmin ? "school_001" : null,
      createdAt: now,
      updatedAt: now,
    };
  }
}

/**
 * Get a user's profile from users/{uid}
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userDocRef = doc(db, "users", uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("[USER PROFILE] Error getting profile:", error);
    return null;
  }
}

/**
 * Get all user profiles (Admin only)
 */
export async function getAllUserProfiles(): Promise<UserProfile[]> {
  try {
    const usersCol = collection(db, "users");
    const q = query(usersCol, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const users: UserProfile[] = [];
    snap.forEach((d) => {
      users.push(d.data() as UserProfile);
    });
    return users;
  } catch (error) {
    console.error("[USER PROFILE] Error fetching all user profiles:", error);
    return [];
  }
}

/**
 * Create user profile by Admin (Admin only)
 */
export async function createUserProfileByAdmin(
  profile: UserProfile
): Promise<boolean> {
  try {
    const userDocRef = doc(db, "users", profile.uid);
    const now = new Date().toISOString();
    const data: UserProfile = {
      ...profile,
      createdAt: profile.createdAt || now,
      updatedAt: now,
    };
    await setDoc(userDocRef, data, { merge: true });
    console.log(`[USER PROFILE] Successfully created user profile ${profile.uid}:`, data);
    return true;
  } catch (error: any) {
    console.error(`[USER PROFILE] Error creating user profile:`, {
      operation: "setDoc",
      path: `users/${profile.uid}`,
      errorCode: error?.code,
      errorMessage: error?.message,
      currentUserUid: auth.currentUser?.uid,
      currentUserEmail: auth.currentUser?.email,
    });
    return false;
  }
}

/**
 * Update user profile by Admin (Admin only)
 */
export async function updateUserProfileByAdmin(
  uid: string,
  updates: Partial<UserProfile>
): Promise<boolean> {
  try {
    const userDocRef = doc(db, "users", uid);
    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(userDocRef, updateData, { merge: true });
    console.log(`[USER PROFILE] Successfully updated user ${uid}:`, updateData);
    return true;
  } catch (error: any) {
    console.error(`[USER PROFILE] Error updating user ${uid}:`, {
      operation: "setDoc",
      path: `users/${uid}`,
      errorCode: error?.code,
      errorMessage: error?.message,
      currentUserUid: auth.currentUser?.uid,
      currentUserEmail: auth.currentUser?.email,
    });
    return false;
  }
}

/**
 * Delete user profile by Admin
 */
export async function deleteUserProfileByAdmin(uid: string): Promise<boolean> {
  try {
    const userDocRef = doc(db, "users", uid);
    await deleteDoc(userDocRef);
    console.log(`[USER PROFILE] Successfully deleted user profile ${uid}`);
    return true;
  } catch (error: any) {
    console.error(`[USER PROFILE] Error deleting user profile ${uid}:`, {
      operation: "deleteDoc",
      path: `users/${uid}`,
      errorCode: error?.code,
      errorMessage: error?.message,
      currentUserUid: auth.currentUser?.uid,
      currentUserEmail: auth.currentUser?.email,
    });
    return false;
  }
}

/**
 * Get all schools from schools collection (Admin only)
 */
export async function getAllSchools(): Promise<School[]> {
  try {
    const schoolsCol = collection(db, "schools");
    const snap = await getDocs(schoolsCol);
    if (snap.empty) {
      return [];
    }
    const list: School[] = [];
    snap.forEach((d) => {
      list.push(d.data() as School);
    });
    return list;
  } catch (error: any) {
    console.error("[SCHOOLS] Error fetching schools:", {
      operation: "getDocs",
      path: "schools",
      errorCode: error?.code,
      errorMessage: error?.message,
      currentUserUid: auth.currentUser?.uid,
      currentUserEmail: auth.currentUser?.email,
    });
    return [];
  }
}

/**
 * Get school by schoolId
 */
export async function getSchool(schoolId: string): Promise<School | null> {
  if (!schoolId || !schoolId.trim()) return null;
  try {
    const schoolDocRef = doc(db, "schools", schoolId.trim());
    const snap = await getDoc(schoolDocRef);
    if (snap.exists()) {
      return snap.data() as School;
    }
    return null;
  } catch (error: any) {
    console.error(`[SCHOOLS] Error fetching school ${schoolId}:`, {
      operation: "getDoc",
      path: `schools/${schoolId.trim()}`,
      errorCode: error?.code,
      errorMessage: error?.message,
      currentUserUid: auth.currentUser?.uid,
      currentUserEmail: auth.currentUser?.email,
    });
    return null;
  }
}

/**
 * Save or update a School entity
 */
export async function saveSchool(school: School): Promise<boolean> {
  try {
    const schoolDocRef = doc(db, "schools", school.id);
    const data = {
      ...school,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(schoolDocRef, data, { merge: true });
    console.log(`[SCHOOLS] Successfully saved school ${school.id}`);
    return true;
  } catch (error: any) {
    console.error(`[SCHOOLS] Error saving school ${school.id}:`, {
      operation: "setDoc",
      path: `schools/${school.id}`,
      errorCode: error?.code,
      errorMessage: error?.message,
      currentUserUid: auth.currentUser?.uid,
      currentUserEmail: auth.currentUser?.email,
    });
    return false;
  }
}

/**
 * Delete a school
 */
export async function deleteSchool(schoolId: string): Promise<boolean> {
  try {
    const schoolDocRef = doc(db, "schools", schoolId);
    await deleteDoc(schoolDocRef);
    console.log(`[SCHOOLS] Successfully deleted school ${schoolId}`);
    return true;
  } catch (error: any) {
    console.error(`[SCHOOLS] Error deleting school ${schoolId}:`, {
      operation: "deleteDoc",
      path: `schools/${schoolId}`,
      errorCode: error?.code,
      errorMessage: error?.message,
      currentUserUid: auth.currentUser?.uid,
      currentUserEmail: auth.currentUser?.email,
    });
    return false;
  }
}

/**
 * Save complete full state to school path: schools/{schoolId}/timetable_data/main
 */
export async function saveSchoolTimetable(
  schoolId: string,
  fullData: {
    teachers: any[];
    classes: any[];
    subjects: any[];
    assignments: any[];
    timeConfig: any;
    cells: any[];
    versions: any[];
  },
  userSummaryOrContext?: UserSummary | string,
  maybeContext?: string
): Promise<boolean> {
  if (!schoolId || !schoolId.trim()) {
    console.warn("[FIRESTORE MULTI-TENANT] Cannot save: schoolId is empty.");
    return false;
  }

  let userSummary: UserSummary | undefined;
  let context = "SAVE_SCHOOL_TIMETABLE";

  if (typeof userSummaryOrContext === 'string') {
    context = userSummaryOrContext;
  } else if (userSummaryOrContext) {
    userSummary = userSummaryOrContext;
    if (maybeContext) context = maybeContext;
  }

  const cleanSchoolId = schoolId.trim();
  const normalizedTeachers = (fullData.teachers || []).map((t) => normalizeTeacher(t));
  normalizedTeachers.forEach((t) => validateTeacherData(t));

  const cleanFullData = {
    ...fullData,
    teachers: normalizedTeachers,
  };

  const payloadStr = JSON.stringify(cleanFullData);
  const updatedAt = new Date().toISOString();

  const docRef = doc(db, "schools", cleanSchoolId, "timetable_data", "main");
  const docPath = `schools/${cleanSchoolId}/timetable_data/main`;

  return await performWriteDiagnostic(
    "setDoc",
    `schools/${cleanSchoolId}/timetable_data`,
    "main",
    async () => {
      await setDoc(docRef, {
        schoolId: cleanSchoolId,
        payload: payloadStr,
        teachersCount: normalizedTeachers.length,
        assignmentsCount: cleanFullData.assignments.length,
        updatedAt,
        lastUpdatedBy: userSummary || null,
      });
    },
    { schoolId: cleanSchoolId, payloadLength: payloadStr.length },
    `${context} -> ${docPath}`
  );
}

/**
 * Load full state from school path: schools/{schoolId}/timetable_data/main
 */
export async function loadSchoolTimetable(schoolId: string): Promise<any | null> {
  if (!schoolId || !schoolId.trim()) {
    console.warn("[FIRESTORE MULTI-TENANT] Cannot load: schoolId is empty.");
    return null;
  }

  const cleanSchoolId = schoolId.trim();
  const docRef = doc(db, "schools", cleanSchoolId, "timetable_data", "main");

  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && data.payload) {
        return JSON.parse(data.payload);
      }
    }
    return null;
  } catch (error) {
    console.error(`[FIRESTORE MULTI-TENANT] Error loading school timetable for ${cleanSchoolId}:`, error);
    throw error;
  }
}

/**
 * Save timetable version under schools/{schoolId}/versions/{versionId}
 */
export async function saveSchoolTimetableVersion(
  schoolId: string,
  version: any,
  userSummary?: UserSummary
): Promise<boolean> {
  if (!schoolId || !schoolId.trim()) return false;
  const cleanSchoolId = schoolId.trim();
  const versionRef = doc(db, "schools", cleanSchoolId, "versions", version.id);

  return await performWriteDiagnostic(
    "setDoc",
    `schools/${cleanSchoolId}/versions`,
    version.id,
    async () => {
      await setDoc(versionRef, {
        ...version,
        schoolId: cleanSchoolId,
        createdBy: userSummary || null,
        updatedAt: new Date().toISOString(),
      });
    },
    { schoolId: cleanSchoolId, versionId: version.id, name: version.name },
    `SAVE_SCHOOL_VERSION -> schools/${cleanSchoolId}/versions/${version.id}`
  );
}

/**
 * Load all timetable versions for a school from schools/{schoolId}/versions
 */
export async function loadSchoolTimetableVersions(schoolId: string): Promise<any[]> {
  if (!schoolId || !schoolId.trim()) return [];
  const cleanSchoolId = schoolId.trim();

  try {
    const versionsCol = collection(db, "schools", cleanSchoolId, "versions");
    const snap = await getDocs(versionsCol);
    const list: any[] = [];
    snap.forEach((d) => {
      list.push(d.data());
    });
    // Sort descending by timestamp/updatedAt
    list.sort((a, b) => new Date(b.updatedAt || b.timestamp || 0).getTime() - new Date(a.updatedAt || a.timestamp || 0).getTime());
    return list;
  } catch (error) {
    console.error(`[FIRESTORE MULTI-TENANT] Error loading versions for school ${cleanSchoolId}:`, error);
    return [];
  }
}

/**
 * Delete a timetable version from schools/{schoolId}/versions/{versionId}
 */
export async function deleteSchoolTimetableVersion(
  schoolId: string,
  versionId: string
): Promise<boolean> {
  if (!schoolId || !schoolId.trim() || !versionId) return false;
  const cleanSchoolId = schoolId.trim();
  const versionRef = doc(db, "schools", cleanSchoolId, "versions", versionId);

  return await performWriteDiagnostic(
    "deleteDoc",
    `schools/${cleanSchoolId}/versions`,
    versionId,
    async () => {
      await deleteDoc(versionRef);
    },
    undefined,
    `DELETE_SCHOOL_VERSION -> schools/${cleanSchoolId}/versions/${versionId}`
  );
}

/**
 * Aliases for compatibility
 */
export const saveSchoolVersion = saveSchoolTimetableVersion;
export const getSchoolVersions = loadSchoolTimetableVersions;
export const deleteSchoolVersion = deleteSchoolTimetableVersion;

