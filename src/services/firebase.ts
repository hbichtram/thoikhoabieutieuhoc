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
  where,
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
export const ADMIN_UID = "CDDP2wg0tWb1E01arXBouCfd4ZP2";

export function isSystemAdminUser(user?: { uid?: string; email?: string | null } | null): boolean {
  if (!user) return false;
  if (user.uid && user.uid === ADMIN_UID) return true;
  if (user.email && user.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()) return true;
  return false;
}

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
  console.log(`[AUTH READY]\nuid: ${user.uid}\nemail: ${user.email || 'none'}`);

  const userDocRef = doc(db, "users", user.uid);
  const now = new Date().toISOString();
  const isAdmin = isSystemAdminUser(user);

  try {
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      // If user is designated default admin, ensure role is admin & active
      if (isAdmin && (data.role !== "admin" || data.status !== "active")) {
        const updated: UserProfile = {
          ...data,
          displayName: data.displayName || user.displayName || user.email?.split('@')[0] || "Admin",
          email: user.email || data.email || null,
          role: "admin",
          status: "active",
          updatedAt: now,
        };
        await setDoc(userDocRef, updated, { merge: true });
        
        console.log(`[USER PROFILE]\nuid: ${updated.uid}\nrole: ${updated.role}\nschoolId: ${updated.schoolId || 'none'}\nstatus: ${updated.status}`);
        console.log(`[AUTHORIZATION]\nisAdmin: true\nisManager: false\nisApproved: true`);
        return updated;
      }

      const isManager = data.role === "manager";
      const isApproved = data.status === "active";
      console.log(`[USER PROFILE]\nuid: ${data.uid}\nrole: ${data.role}\nschoolId: ${data.schoolId || 'none'}\nstatus: ${data.status}`);
      console.log(`[AUTHORIZATION]\nisAdmin: ${data.role === 'admin'}\nisManager: ${isManager}\nisApproved: ${isApproved}`);
      return data;
    } else {
      // Check if user was pre-registered by Admin using email
      let preRegistered: UserProfile | null = null;
      if (user.email) {
        try {
          const q = query(
            collection(db, "users"),
            where("email", "==", user.email.trim().toLowerCase())
          );
          const querySnap = await getDocs(q);
          if (!querySnap.empty) {
            const foundDoc = querySnap.docs[0];
            preRegistered = foundDoc.data() as UserProfile;
            // Clean up temporary pre-registered doc if UID differed
            if (foundDoc.id !== user.uid) {
              try {
                await deleteDoc(doc(db, "users", foundDoc.id));
              } catch (_) {}
            }
          }
        } catch (queryErr) {
          console.warn("[USER PROFILE] Could not query pre-registered users:", queryErr);
        }
      }

      // Create initial profile
      const newProfile: UserProfile = {
        uid: user.uid,
        displayName: user.displayName || preRegistered?.displayName || user.email?.split('@')[0] || "Người dùng",
        email: user.email || null,
        photoURL: user.photoURL || null,
        role: isAdmin ? "admin" : (preRegistered?.role || "manager"),
        status: isAdmin ? "active" : (preRegistered?.status || "pending"),
        schoolId: isAdmin ? (preRegistered?.schoolId || null) : (preRegistered?.schoolId || null),
        schoolName: preRegistered?.schoolName || null,
        createdAt: preRegistered?.createdAt || now,
        updatedAt: now,
      };

      await setDoc(userDocRef, newProfile);
      
      const isManager = newProfile.role === "manager";
      const isApproved = newProfile.status === "active";
      console.log(`[USER PROFILE]\nuid: ${newProfile.uid}\nrole: ${newProfile.role}\nschoolId: ${newProfile.schoolId || 'none'}\nstatus: ${newProfile.status}`);
      console.log(`[AUTHORIZATION]\nisAdmin: ${newProfile.role === 'admin'}\nisManager: ${isManager}\nisApproved: ${isApproved}`);
      return newProfile;
    }
  } catch (error: any) {
    console.error("[USER PROFILE] Error syncing profile:", {
      operation: "syncUserProfile",
      path: `users/${user.uid}`,
      errorCode: error?.code,
      errorMessage: error?.message,
      currentUserUid: user.uid,
      currentUserEmail: user.email,
    });
    
    // In-memory fallback
    const fallbackProfile: UserProfile = {
      uid: user.uid,
      displayName: user.displayName || user.email?.split('@')[0] || "Người dùng",
      email: user.email || null,
      photoURL: user.photoURL || null,
      role: isAdmin ? "admin" : "manager",
      status: isAdmin ? "active" : "pending",
      schoolId: null,
      createdAt: now,
      updatedAt: now,
    };
    return fallbackProfile;
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
  const currentUser = auth.currentUser;
  const isAdmin = isSystemAdminUser(currentUser);
  const data = {
    ...school,
    updatedAt: new Date().toISOString(),
  };

  console.log(`[SCHOOL CREATE REQUEST]\nuid: ${currentUser?.uid || 'none'}\nemail: ${currentUser?.email || 'none'}\nisAdmin: ${isAdmin}\nschoolId: ${school.id}\ndata:`, data);

  try {
    const schoolDocRef = doc(db, "schools", school.id);
    await setDoc(schoolDocRef, data, { merge: true });
    console.log(`[SCHOOL CREATE]\nsuccess: Successfully saved school ${school.id}`);
    console.log(`[FIRESTORE RESULT]\noperation: create\npath: schools/${school.id}\nuid: ${currentUser?.uid}\nrole: ${isAdmin ? 'admin' : 'manager'}\nschoolId: ${school.id}\nstatus: success`);
    return true;
  } catch (error: any) {
    console.error(`[SCHOOL CREATE]\nerror: Failed to save school ${school.id}`);
    console.error(`[FIRESTORE RESULT]\noperation: create\npath: schools/${school.id}\nuid: ${currentUser?.uid}\nrole: ${isAdmin ? 'admin' : 'manager'}\nschoolId: ${school.id}\nerrorCode: ${error?.code}\nerrorMessage: ${error?.message}`);
    return false;
  }
}

/**
 * Delete a school
 */
export async function deleteSchool(schoolId: string): Promise<boolean> {
  const currentUser = auth.currentUser;
  const isAdmin = isSystemAdminUser(currentUser);

  try {
    const schoolDocRef = doc(db, "schools", schoolId);
    await deleteDoc(schoolDocRef);
    console.log(`[SCHOOL DELETE]\nsuccess: Successfully deleted school ${schoolId}`);
    console.log(`[FIRESTORE RESULT]\noperation: delete\npath: schools/${schoolId}\nuid: ${currentUser?.uid}\nrole: ${isAdmin ? 'admin' : 'manager'}\nschoolId: ${schoolId}\nstatus: success`);
    return true;
  } catch (error: any) {
    console.error(`[SCHOOL DELETE]\nerror: Failed to delete school ${schoolId}`);
    console.error(`[FIRESTORE RESULT]\noperation: delete\npath: schools/${schoolId}\nuid: ${currentUser?.uid}\nrole: ${isAdmin ? 'admin' : 'manager'}\nschoolId: ${schoolId}\nerrorCode: ${error?.code}\nerrorMessage: ${error?.message}`);
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
  const timetablePath = `schools/${cleanSchoolId}/timetable_data/main`;
  console.log(`[SCHOOL LOAD]\nschoolId: ${cleanSchoolId}`);
  console.log(`[TIMETABLE LOAD]\npath: ${timetablePath}`);

  const docRef = doc(db, "schools", cleanSchoolId, "timetable_data", "main");

  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && data.payload) {
        console.log(`[FIRESTORE RESULT]\nsuccess: Loaded timetable for ${cleanSchoolId}`);
        return JSON.parse(data.payload);
      }
    }
    console.log(`[FIRESTORE RESULT]\nsuccess: No existing timetable document for ${cleanSchoolId} (empty dataset)`);
    return null;
  } catch (error: any) {
    console.error(`[FIRESTORE RESULT]\nerror: Failed to load ${timetablePath}`, {
      code: error?.code,
      message: error?.message,
      currentUserUid: auth.currentUser?.uid,
      currentUserEmail: auth.currentUser?.email,
    });
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

