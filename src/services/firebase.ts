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
import { UserProfile, School, UserSummary, AuthorizedUser } from "../types";

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

export async function loginWithGoogle(): Promise<User | null> {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account',
    });
    const result = await signInWithPopup(auth, provider);
    const selectedEmail = result.user.email || '';
    console.log(`[GOOGLE ACCOUNT SELECTED]\nemail: ${selectedEmail}`);
    console.log(`[AUTH READY]\nuid: ${result.user.uid}\nemail: ${selectedEmail}`);
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
      console.log(`[AUTH READY]\nuid: ${user.uid}\nemail: ${user.email || ''}`);
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
 * Collection: authorized_users/{emailKey}
 * Where emailKey is email.toLowerCase().trim()
 */
export async function getAuthorizedUserByEmail(email: string): Promise<AuthorizedUser | null> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return null;
  try {
    const authDocRef = doc(db, "authorized_users", cleanEmail);
    const snap = await getDoc(authDocRef);
    if (snap.exists()) {
      return snap.data() as AuthorizedUser;
    }
    return null;
  } catch (err) {
    console.warn("[AUTH] Could not get authorized_users doc:", err);
    return null;
  }
}

export async function createAuthorizedUser(data: AuthorizedUser): Promise<boolean> {
  const cleanEmail = data.email.trim().toLowerCase();
  const now = new Date().toISOString();
  const payload: AuthorizedUser = {
    email: cleanEmail,
    displayName: data.displayName || cleanEmail.split('@')[0],
    role: data.role || 'manager',
    status: data.status || 'active',
    schoolId: data.schoolId || null,
    schoolName: data.schoolName || null,
    createdAt: data.createdAt || now,
    updatedAt: now,
  };
  try {
    const authDocRef = doc(db, "authorized_users", cleanEmail);
    await setDoc(authDocRef, payload, { merge: true });
    console.log(`[AUTH] Successfully saved authorized_users/${cleanEmail}:`, payload);
    return true;
  } catch (err: any) {
    console.error("[AUTH] Error saving authorized_user:", err);
    return false;
  }
}

export async function updateAuthorizedUser(email: string, updates: Partial<AuthorizedUser>): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  const now = new Date().toISOString();
  try {
    const authDocRef = doc(db, "authorized_users", cleanEmail);
    await setDoc(authDocRef, { ...updates, updatedAt: now }, { merge: true });
    return true;
  } catch (err) {
    console.error("[AUTH] Error updating authorized_user:", err);
    return false;
  }
}

export async function deleteAuthorizedUser(email: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const authDocRef = doc(db, "authorized_users", cleanEmail);
    await deleteDoc(authDocRef);
    return true;
  } catch (err) {
    console.error("[AUTH] Error deleting authorized_user:", err);
    return false;
  }
}

export async function getAllAuthorizedUsers(): Promise<AuthorizedUser[]> {
  try {
    const colRef = collection(db, "authorized_users");
    const q = query(colRef, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const list: AuthorizedUser[] = [];
    snap.forEach((d) => list.push(d.data() as AuthorizedUser));
    return list;
  } catch (err) {
    console.error("[AUTH] Error fetching all authorized_users:", err);
    return [];
  }
}

export async function findPreRegisteredProfileByEmail(rawEmail: string): Promise<UserProfile | null> {
  const cleanEmail = rawEmail.trim().toLowerCase();
  if (!cleanEmail) return null;

  // 1. Check authorized_users collection doc
  try {
    const authSnap = await getDoc(doc(db, "authorized_users", cleanEmail));
    if (authSnap.exists()) {
      const data = authSnap.data() as AuthorizedUser;
      return {
        uid: `auth_${cleanEmail}`,
        email: cleanEmail,
        displayName: data.displayName || cleanEmail.split('@')[0],
        photoURL: null,
        role: data.role || 'manager',
        status: data.status || 'active',
        schoolId: data.schoolId || null,
        schoolName: data.schoolName || null,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.warn("[LOOKUP] Error checking authorized_users:", err);
  }

  // 2. Query users collection by lowercase email
  try {
    const q1 = query(collection(db, "users"), where("email", "==", cleanEmail));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      const docData = snap1.docs[0].data() as UserProfile;
      return {
        ...docData,
        uid: snap1.docs[0].id,
      };
    }
  } catch (err) {
    console.warn("[LOOKUP] Error querying users by lowercase email:", err);
  }

  // 3. Query users collection by raw email (if case differs)
  if (rawEmail !== cleanEmail) {
    try {
      const q2 = query(collection(db, "users"), where("email", "==", rawEmail));
      const snap2 = await getDocs(q2);
      if (!snap2.empty) {
        const docData = snap2.docs[0].data() as UserProfile;
        return {
          ...docData,
          uid: snap2.docs[0].id,
        };
      }
    } catch (err) {
      console.warn("[LOOKUP] Error querying users by raw email:", err);
    }
  }

  // 4. Check direct users/{cleanEmail} or users/{rawEmail}
  try {
    const docSnap1 = await getDoc(doc(db, "users", cleanEmail));
    if (docSnap1.exists()) {
      return {
        ...(docSnap1.data() as UserProfile),
        uid: docSnap1.id,
      };
    }
  } catch (_) {}

  return null;
}

/**
 * Sync or retrieve user profile in Firestore: users/{uid}
 * Logic:
 * 1. Checks if System Admin -> returns admin profile
 * 2. Checks users/{googleUid}
 * 3. If not found by UID, searches by email (authorized_users, users query by email)
 * 4. If found by email, links/updates to users/{googleUid} preserving role, schoolId, status, displayName
 * 5. Outputs formatted logs for tracking
 */
export async function syncUserProfile(user: User): Promise<UserProfile | null> {
  const googleUid = user.uid;
  const rawEmail = user.email || '';
  const email = rawEmail.toLowerCase().trim();

  console.log(`[GOOGLE LOGIN]\nemail: ${rawEmail || 'none'}`);

  const now = new Date().toISOString();
  const isAdmin = isSystemAdminUser(user);

  try {
    // 1. If System Admin
    if (isAdmin) {
      const userDocRef = doc(db, "users", googleUid);
      const adminProfile: UserProfile = {
        uid: googleUid,
        displayName: user.displayName || email.split('@')[0] || "Admin Hệ Thống",
        email: email || null,
        photoURL: user.photoURL || null,
        role: "admin",
        status: "active",
        schoolId: null,
        schoolName: null,
        createdAt: now,
        updatedAt: now,
      };
      try {
        await setDoc(userDocRef, adminProfile, { merge: true });
      } catch (err) {
        console.warn("[AUTH] Admin setDoc warning:", err);
      }

      console.log(`[PROFILE LOOKUP]\nlookupByUid: FOUND (${googleUid})\nlookupByEmail: FOUND (${email})`);
      console.log(`[PROFILE FOUND]\nuid: ${googleUid}\nemail: ${email}\nrole: admin\nstatus: active\nschoolId: none`);
      console.log(`[AUTHORIZATION]\nisAdmin: true\nisManager: false\nisApproved: true`);
      console.log(`[LOGIN RESULT]\nsuccess: true\nrole: admin\nschoolId: none`);
      return adminProfile;
    }

    // 2. Lookup by UID
    let lookupByUidStatus = 'NOT_FOUND';
    let profileByUid: UserProfile | null = null;
    try {
      const userDocRef = doc(db, "users", googleUid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        profileByUid = userSnap.data() as UserProfile;
        lookupByUidStatus = `FOUND (${googleUid})`;
      }
    } catch (err) {
      console.warn("[PROFILE LOOKUP] Could not check users/{uid}:", err);
    }

    // 3. Lookup by Email
    let lookupByEmailStatus = 'NOT_FOUND';
    let profileByEmail: UserProfile | null = null;
    if (email) {
      profileByEmail = await findPreRegisteredProfileByEmail(rawEmail);
      if (profileByEmail) {
        lookupByEmailStatus = `FOUND (${profileByEmail.email || email})`;
      }
    }

    console.log(`[PROFILE LOOKUP]\nlookupByUid: ${lookupByUidStatus}\nlookupByEmail: ${lookupByEmailStatus}`);

    // If neither was found
    if (!profileByUid && !profileByEmail) {
      console.warn(`[USER PROFILE] No registered profile found for email: ${email} or UID: ${googleUid}`);
      console.log(`[AUTHORIZATION]\nisAdmin: false\nisManager: false\nisApproved: false`);
      console.log(`[LOGIN RESULT]\nsuccess: false\nrole: none\nschoolId: none`);
      return null;
    }

    // 4. Resolve matched profile
    const baseSource = profileByEmail || profileByUid!;
    const isLinking = profileByEmail && profileByEmail.uid !== googleUid;

    const finalRole = baseSource.role || "manager";
    const finalStatus = baseSource.status || "active";
    const finalSchoolId = baseSource.schoolId || null;
    const finalSchoolName = baseSource.schoolName || null;

    const userDocRef = doc(db, "users", googleUid);
    const userProfile: UserProfile = {
      uid: googleUid,
      displayName: user.displayName || baseSource.displayName || email.split('@')[0] || "Cán bộ quản lý",
      email: email || baseSource.email,
      photoURL: user.photoURL || baseSource.photoURL || null,
      role: finalRole,
      status: finalStatus,
      schoolId: finalSchoolId,
      schoolName: finalSchoolName,
      createdAt: baseSource.createdAt || now,
      updatedAt: now,
    };

    // Save/Update users/{googleUid}
    try {
      await setDoc(userDocRef, userProfile, { merge: true });
    } catch (writeErr) {
      console.warn("[USER PROFILE] Could not write users/{uid}:", writeErr);
    }

    // Account link log & cleanup of old temporary ID if applicable
    if (isLinking && profileByEmail) {
      console.log(`[ACCOUNT LINK]\noldProfile: ${profileByEmail.uid}\nnewUid: ${googleUid}\nsuccess: true`);
      if (profileByEmail.uid.startsWith("user_")) {
        try {
          await deleteDoc(doc(db, "users", profileByEmail.uid));
        } catch (_) {}
      }
    } else {
      console.log(`[ACCOUNT LINK]\noldProfile: ${profileByUid ? googleUid : 'none'}\nnewUid: ${googleUid}\nsuccess: true`);
    }

    // Print Profile Found
    console.log(`[PROFILE FOUND]\nuid: ${userProfile.uid}\nemail: ${userProfile.email || email}\nrole: ${userProfile.role}\nstatus: ${userProfile.status}\nschoolId: ${userProfile.schoolId || 'none'}`);

    const isManagerRole = userProfile.role === 'manager';
    const isApprovedStatus = userProfile.status === 'active';

    console.log(`[AUTHORIZATION]\nisAdmin: false\nisManager: ${isManagerRole}\nisApproved: ${isApprovedStatus}`);
    console.log(`[LOGIN RESULT]\nsuccess: ${isApprovedStatus}\nrole: ${userProfile.role}\nschoolId: ${userProfile.schoolId || 'none'}`);

    return userProfile;
  } catch (error: any) {
    console.error("[USER PROFILE] Error syncing profile:", {
      operation: "syncUserProfile",
      path: `users/${user.uid}`,
      errorCode: error?.code,
      errorMessage: error?.message,
      currentUserUid: user.uid,
      currentUserEmail: user.email,
    });
    return null;
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
 * Merges users collection with authorized_users collection so pre-registered staff are visible
 */
export async function getAllUserProfiles(): Promise<UserProfile[]> {
  try {
    const [usersSnap, authUsers] = await Promise.all([
      getDocs(query(collection(db, "users"), orderBy("createdAt", "desc"))).catch(() => null),
      getAllAuthorizedUsers().catch(() => []),
    ]);

    const usersMap = new Map<string, UserProfile>();

    // 1. Add from users collection
    if (usersSnap) {
      usersSnap.forEach((d) => {
        const u = d.data() as UserProfile;
        if (u.email) {
          usersMap.set(u.email.toLowerCase().trim(), u);
        } else {
          usersMap.set(u.uid, u);
        }
      });
    }

    // 2. Merge with authorized_users
    for (const authU of authUsers) {
      const email = authU.email.toLowerCase().trim();
      const existing = usersMap.get(email);
      if (existing) {
        usersMap.set(email, {
          ...existing,
          role: authU.role || existing.role,
          status: authU.status || existing.status,
          schoolId: authU.schoolId !== undefined ? authU.schoolId : existing.schoolId,
          schoolName: authU.schoolName || existing.schoolName,
        });
      } else {
        usersMap.set(email, {
          uid: `auth_${email.replace(/[^a-z0-9]/g, '_')}`,
          displayName: authU.displayName,
          email: authU.email,
          photoURL: null,
          role: authU.role,
          status: authU.status,
          schoolId: authU.schoolId,
          schoolName: authU.schoolName || null,
          createdAt: authU.createdAt,
          updatedAt: authU.updatedAt,
        });
      }
    }

    return Array.from(usersMap.values()).sort((a, b) => 
      (b.createdAt || '').localeCompare(a.createdAt || '')
    );
  } catch (error) {
    console.error("[USER PROFILE] Error fetching all user profiles:", error);
    return [];
  }
}

/**
 * Create user profile by Admin (Admin only)
 * Stores in authorized_users and users collection
 */
export async function createUserProfileByAdmin(
  profile: UserProfile
): Promise<boolean> {
  try {
    const cleanEmail = profile.email ? profile.email.trim().toLowerCase() : '';
    const now = new Date().toISOString();

    // 1. Save to authorized_users first
    if (cleanEmail) {
      await createAuthorizedUser({
        email: cleanEmail,
        displayName: profile.displayName || cleanEmail.split('@')[0],
        role: profile.role || 'manager',
        status: profile.status || 'active',
        schoolId: profile.schoolId || null,
        schoolName: profile.schoolName || null,
        createdAt: profile.createdAt || now,
        updatedAt: now,
      });
    }

    // 2. Also save to users/{uid}
    const userDocRef = doc(db, "users", profile.uid);
    const data: UserProfile = {
      ...profile,
      email: cleanEmail || profile.email,
      createdAt: profile.createdAt || now,
      updatedAt: now,
    };
    await setDoc(userDocRef, data, { merge: true });
    console.log(`[USER PROFILE] Successfully created user profile:`, data);
    return true;
  } catch (error: any) {
    console.error(`[USER PROFILE] Error creating user profile:`, error);
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
    const now = new Date().toISOString();
    const userDocRef = doc(db, "users", uid);
    
    let targetEmail = updates.email;
    if (!targetEmail) {
      try {
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          targetEmail = snap.data()?.email;
        }
      } catch (_) {}
    }

    // Update authorized_users
    if (targetEmail) {
      const cleanEmail = targetEmail.trim().toLowerCase();
      await updateAuthorizedUser(cleanEmail, {
        ...(updates.role ? { role: updates.role } : {}),
        ...(updates.status ? { status: updates.status } : {}),
        ...(updates.schoolId !== undefined ? { schoolId: updates.schoolId } : {}),
        ...(updates.schoolName !== undefined ? { schoolName: updates.schoolName } : {}),
        ...(updates.displayName ? { displayName: updates.displayName } : {}),
      });
    }

    // Update users/{uid} if real uid
    if (!uid.startsWith("auth_")) {
      const updateData = {
        ...updates,
        updatedAt: now,
      };
      await setDoc(userDocRef, updateData, { merge: true });
    }

    console.log(`[USER PROFILE] Successfully updated user ${uid}:`, updates);
    return true;
  } catch (error: any) {
    console.error(`[USER PROFILE] Error updating user ${uid}:`, error);
    return false;
  }
}

/**
 * Delete user profile by Admin
 */
export async function deleteUserProfileByAdmin(uid: string, email?: string | null): Promise<boolean> {
  try {
    let targetEmail = email;
    if (!targetEmail) {
      try {
        const userDocRef = doc(db, "users", uid);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          targetEmail = snap.data()?.email;
        }
      } catch (_) {}
    }

    // Delete from authorized_users
    if (targetEmail) {
      await deleteAuthorizedUser(targetEmail.trim().toLowerCase());
    }

    // Delete from users collection
    if (!uid.startsWith("auth_")) {
      const userDocRef = doc(db, "users", uid);
      await deleteDoc(userDocRef);
    }
    
    console.log(`[USER PROFILE] Successfully deleted user ${uid} / ${targetEmail}`);
    return true;
  } catch (error: any) {
    console.error(`[USER PROFILE] Error deleting user profile ${uid}:`, error);
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

export interface SaveSchoolResult {
  success: boolean;
  error?: string;
  errorCode?: string;
  path?: string;
}

/**
 * Save or update a School entity
 */
export async function saveSchool(school: School): Promise<SaveSchoolResult> {
  const currentUser = auth.currentUser;
  const isAdmin = isSystemAdminUser(currentUser);
  const cleanId = String(school.id || "").trim();
  const path = `schools/${cleanId}`;

  const cleanSchoolData: School = {
    id: cleanId,
    name: String(school.name || "").trim(),
    code: String(school.code || cleanId).trim().toUpperCase(),
    address: school.address ? String(school.address).trim() : "",
    createdAt: school.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  console.log(`[SCHOOL CREATE AUTH]\nuid: ${currentUser?.uid || "none"}\nemail: ${currentUser?.email || "none"}\nisAdmin: ${isAdmin}\nrole: ${isAdmin ? "admin" : "manager"}\nschoolId: ${cleanId}`);
  console.log(`[SCHOOL CREATE PATH]\n${path}`);
  console.log("[SCHOOL CREATE DATA]", cleanSchoolData);

  try {
    const schoolDocRef = doc(db, "schools", cleanId);
    await setDoc(schoolDocRef, cleanSchoolData, { merge: true });
    
    console.log(`[SCHOOL CREATE]\nsuccess: true`);
    console.log(`[FIRESTORE RESULT]\noperation: create\nsuccess: true\npath: ${path}\nuid: ${currentUser?.uid}\nrole: ${isAdmin ? "admin" : "manager"}\nschoolId: ${cleanId}\nstatus: success`);
    return { success: true, path };
  } catch (error: any) {
    console.error("[SCHOOL CREATE FAILED]", {
      uid: currentUser?.uid,
      email: currentUser?.email,
      errorCode: error?.code,
      errorMessage: error?.message,
      errorName: error?.name,
      path,
      error,
    });
    console.error(`[FIRESTORE RESULT]\noperation: create\npath: ${path}\nuid: ${currentUser?.uid}\nrole: ${isAdmin ? "admin" : "manager"}\nschoolId: ${cleanId}\nerrorCode: ${error?.code}\nerrorMessage: ${error?.message}`);
    return {
      success: false,
      error: error?.message || "Lỗi Firestore khi tạo trường",
      errorCode: error?.code || "unknown_error",
      path,
    };
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
  console.log(`[MANAGER TIMETABLE LOAD]\npath: ${timetablePath}`);

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

