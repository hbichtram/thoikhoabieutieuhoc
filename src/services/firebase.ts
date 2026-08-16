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
import { UserProfile, School, UserSummary, AuthorizedUser, UserInvite, UserRole, UserStatus } from "../types";

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

export function getEmailKey(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
}

/**
 * Collection: userInvites/{emailKey}
 * Primary provisioned invite storage for Manager pre-registration by Admin.
 */
export async function getUserInviteByEmail(email: string): Promise<UserInvite | null> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return null;
  const key = getEmailKey(cleanEmail);

  // Try direct cleanEmail doc first
  try {
    const snap = await getDoc(doc(db, "userInvites", cleanEmail));
    if (snap.exists()) {
      return snap.data() as UserInvite;
    }
  } catch (_) {}

  // Try sanitized key doc
  try {
    const snap = await getDoc(doc(db, "userInvites", key));
    if (snap.exists()) {
      return snap.data() as UserInvite;
    }
  } catch (_) {}

  // Fallback to authorized_users
  try {
    const authSnap = await getDoc(doc(db, "authorized_users", cleanEmail));
    if (authSnap.exists()) {
      const d = authSnap.data() as any;
      return {
        email: cleanEmail,
        displayName: d.displayName || d.name || cleanEmail.split('@')[0],
        role: d.role || 'manager',
        status: d.status || 'invited',
        schoolId: d.schoolId || null,
        schoolName: d.schoolName || null,
        createdAt: d.createdAt || new Date().toISOString(),
        updatedAt: d.updatedAt || new Date().toISOString(),
      };
    }
  } catch (_) {}

  return null;
}

/**
 * Pending Users & Invitations
 * When Admin creates a user before they sign in for the first time with Google,
 * the record is stored in pendingUsers/{cleanEmail} (and userInvites/{cleanEmail} for compatibility).
 * When the user logs in for the first time with Google, syncUserProfile reads this invitation,
 * creates users/{currentUser.uid}, and deletes/claims the pending invitation.
 */
export async function createPendingUser(data: UserInvite): Promise<boolean> {
  const cleanEmail = data.email.trim().toLowerCase();
  const key = getEmailKey(cleanEmail);
  const now = new Date().toISOString();

  const payload: UserInvite = {
    email: cleanEmail,
    displayName: data.displayName || data.name || cleanEmail.split('@')[0],
    role: data.role || 'manager',
    status: data.status || 'active',
    schoolId: data.schoolId || null,
    schoolName: data.schoolName || null,
    uid: null,
    createdAt: data.createdAt || now,
    updatedAt: now,
    lastLoginAt: data.lastLoginAt || null,
  };

  try {
    // 1. Save to pendingUsers/{cleanEmail}
    await setDoc(doc(db, "pendingUsers", cleanEmail), payload, { merge: true });
    if (key !== cleanEmail) {
      await setDoc(doc(db, "pendingUsers", key), payload, { merge: true });
    }

    // 2. Save to userInvites & authorized_users for compatibility
    await setDoc(doc(db, "userInvites", cleanEmail), payload, { merge: true });
    if (key !== cleanEmail) {
      await setDoc(doc(db, "userInvites", key), payload, { merge: true });
    }
    await setDoc(doc(db, "authorized_users", cleanEmail), payload, { merge: true });

    console.log(`[PENDING USER] Registered invitation for ${cleanEmail} (schoolId: ${payload.schoolId}, role: ${payload.role})`);
    return true;
  } catch (err) {
    console.error("[PENDING USER] Error creating invitation:", err);
    return false;
  }
}

export async function updatePendingUser(email: string, updates: Partial<UserInvite>): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  const key = getEmailKey(cleanEmail);
  const now = new Date().toISOString();
  const payload = { ...updates, updatedAt: now };

  try {
    await setDoc(doc(db, "pendingUsers", cleanEmail), payload, { merge: true });
    if (key !== cleanEmail) {
      await setDoc(doc(db, "pendingUsers", key), payload, { merge: true });
    }
    await setDoc(doc(db, "userInvites", cleanEmail), payload, { merge: true });
    if (key !== cleanEmail) {
      await setDoc(doc(db, "userInvites", key), payload, { merge: true });
    }
    await setDoc(doc(db, "authorized_users", cleanEmail), payload, { merge: true });
    return true;
  } catch (err) {
    console.error("[PENDING USER] Error updating invitation:", err);
    return false;
  }
}

export async function deletePendingUser(email: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  const key = getEmailKey(cleanEmail);
  try {
    await deleteDoc(doc(db, "pendingUsers", cleanEmail)).catch(() => {});
    if (key !== cleanEmail) {
      await deleteDoc(doc(db, "pendingUsers", key)).catch(() => {});
    }
    await deleteDoc(doc(db, "userInvites", cleanEmail)).catch(() => {});
    if (key !== cleanEmail) {
      await deleteDoc(doc(db, "userInvites", key)).catch(() => {});
    }
    await deleteDoc(doc(db, "authorized_users", cleanEmail)).catch(() => {});
    return true;
  } catch (err) {
    console.error("[PENDING USER] Error deleting invitation:", err);
    return false;
  }
}

// User Invites aliases
export async function createUserInvite(data: UserInvite): Promise<boolean> {
  return createPendingUser(data);
}

export async function updateUserInvite(email: string, updates: Partial<UserInvite>): Promise<boolean> {
  return updatePendingUser(email, updates);
}

export async function deleteUserInvite(email: string): Promise<boolean> {
  return deletePendingUser(email);
}

export async function getAllUserInvites(): Promise<UserInvite[]> {
  try {
    const [pendingSnap, invitesSnap] = await Promise.all([
      getDocs(collection(db, "pendingUsers")).catch(() => null),
      getDocs(collection(db, "userInvites")).catch(() => null),
    ]);

    const invitesMap = new Map<string, UserInvite>();
    if (pendingSnap) {
      pendingSnap.forEach((d) => {
        const data = d.data() as UserInvite;
        if (data && data.email) {
          invitesMap.set(data.email.toLowerCase().trim(), data);
        }
      });
    }
    if (invitesSnap) {
      invitesSnap.forEach((d) => {
        const data = d.data() as UserInvite;
        if (data && data.email) {
          const email = data.email.toLowerCase().trim();
          if (!invitesMap.has(email)) {
            invitesMap.set(email, data);
          }
        }
      });
    }
    return Array.from(invitesMap.values());
  } catch (err) {
    console.warn("[USER INVITE] Error reading userInvites collection:", err);
    return [];
  }
}

// Backwards compatibility wrappers
export async function getAuthorizedUserByEmail(email: string): Promise<AuthorizedUser | null> {
  return getUserInviteByEmail(email);
}

export async function createAuthorizedUser(data: AuthorizedUser): Promise<boolean> {
  return createPendingUser(data as UserInvite);
}

export async function updateAuthorizedUser(email: string, updates: Partial<AuthorizedUser>): Promise<boolean> {
  return updatePendingUser(email, updates);
}

export async function deleteAuthorizedUser(email: string): Promise<boolean> {
  return deletePendingUser(email);
}

export async function getAllAuthorizedUsers(): Promise<AuthorizedUser[]> {
  return (await getAllUserInvites()) as AuthorizedUser[];
}

/**
 * Find pre-registered invite or legacy user profile by email.
 * Checks pendingUsers, userInvites, authorized_users and users collection.
 */
export async function findPreRegisteredProfileByEmail(rawEmail: string): Promise<{
  data: UserInvite;
  sourceDocId?: string;
  sourceCollection?: string;
} | null> {
  const cleanEmail = rawEmail.trim().toLowerCase();
  if (!cleanEmail) return null;
  const key = getEmailKey(cleanEmail);

  // 1. Direct get pendingUsers/{cleanEmail} (Highest priority)
  try {
    const snap = await getDoc(doc(db, "pendingUsers", cleanEmail));
    if (snap.exists()) {
      return { data: snap.data() as UserInvite, sourceDocId: cleanEmail, sourceCollection: "pendingUsers" };
    }
  } catch (_) {}

  // 2. Direct get userInvites/{cleanEmail}
  try {
    const snap = await getDoc(doc(db, "userInvites", cleanEmail));
    if (snap.exists()) {
      return { data: snap.data() as UserInvite, sourceDocId: cleanEmail, sourceCollection: "userInvites" };
    }
  } catch (_) {}

  // 3. Direct get pendingUsers/{key}
  if (key !== cleanEmail) {
    try {
      const snap = await getDoc(doc(db, "pendingUsers", key));
      if (snap.exists()) {
        return { data: snap.data() as UserInvite, sourceDocId: key, sourceCollection: "pendingUsers" };
      }
    } catch (_) {}
  }

  // 4. Direct get userInvites/{key}
  if (key !== cleanEmail) {
    try {
      const snap = await getDoc(doc(db, "userInvites", key));
      if (snap.exists()) {
        return { data: snap.data() as UserInvite, sourceDocId: key, sourceCollection: "userInvites" };
      }
    } catch (_) {}
  }

  // 5. Direct get authorized_users/{cleanEmail}
  try {
    const snap = await getDoc(doc(db, "authorized_users", cleanEmail));
    if (snap.exists()) {
      const d = snap.data() as any;
      return {
        data: {
          email: cleanEmail,
          displayName: d.displayName || d.name || cleanEmail.split('@')[0],
          role: d.role || 'manager',
          status: d.status || 'active',
          schoolId: d.schoolId || null,
          schoolName: d.schoolName || null,
          createdAt: d.createdAt || new Date().toISOString(),
          updatedAt: d.updatedAt || new Date().toISOString(),
        },
        sourceDocId: cleanEmail,
        sourceCollection: "authorized_users"
      };
    }
  } catch (_) {}

  // 6. Direct get users/{cleanEmail}
  try {
    const snap = await getDoc(doc(db, "users", cleanEmail));
    if (snap.exists()) {
      const d = snap.data() as any;
      return {
        data: {
          email: cleanEmail,
          displayName: d.displayName || d.name || cleanEmail.split('@')[0],
          role: d.role || 'manager',
          status: d.status || 'active',
          schoolId: d.schoolId || null,
          schoolName: d.schoolName || null,
          createdAt: d.createdAt || new Date().toISOString(),
          updatedAt: d.updatedAt || new Date().toISOString(),
        },
        sourceDocId: cleanEmail,
        sourceCollection: "users"
      };
    }
  } catch (_) {}

  // 7. Query users collection where email == cleanEmail
  try {
    const q = query(collection(db, "users"), where("email", "==", cleanEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      const d = docSnap.data() as any;
      return {
        data: {
          email: cleanEmail,
          displayName: d.displayName || d.name || cleanEmail.split('@')[0],
          role: d.role || 'manager',
          status: d.status || 'active',
          schoolId: d.schoolId || null,
          schoolName: d.schoolName || null,
          createdAt: d.createdAt || new Date().toISOString(),
          updatedAt: d.updatedAt || new Date().toISOString(),
        },
        sourceDocId: docSnap.id,
        sourceCollection: "users"
      };
    }
  } catch (_) {}

  return null;
}

/**
 * Sync or retrieve user profile in Firestore: users/{googleUid}
 * Luồng chuẩn:
 * Firebase Auth -> currentUser.uid -> users/{currentUser.uid} -> userProfile -> schoolId -> schools/{schoolId}
 */
export async function syncUserProfile(user: User): Promise<UserProfile | null> {
  const googleUid = user.uid;
  const rawEmail = user.email || '';
  const cleanEmail = rawEmail.toLowerCase().trim();
  const now = new Date().toISOString();
  const isAdmin = isSystemAdminUser(user);

  console.log(`[AUTH] Firebase UID: ${googleUid}`);
  console.log(`[AUTH] Firebase Email: ${cleanEmail || 'none'}`);
  console.log(`[PROFILE] Looking for:\nusers/${googleUid}`);

  try {
    // 1. If System Admin -> full admin access
    if (isAdmin) {
      console.log(`[PROFILE] UID document exists: true`);
      const adminProfile: UserProfile = {
        uid: googleUid,
        displayName: user.displayName || cleanEmail.split('@')[0] || "Admin Hệ Thống",
        email: cleanEmail || null,
        photoURL: user.photoURL || null,
        role: "admin",
        status: "active",
        schoolId: null,
        schoolName: null,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      };

      try {
        await setDoc(doc(db, "users", googleUid), adminProfile, { merge: true });
      } catch (err) {
        console.warn("[AUTH] Admin setDoc warning:", err);
      }

      console.log(`[PROFILE] Resolved profile document:\nusers/${googleUid}`);
      console.log(`[PROFILE] Resolved UID: ${googleUid}`);
      console.log(`[PROFILE] Role: admin`);
      console.log(`[PROFILE] School ID: none`);
      return adminProfile;
    }

    // 2. Direct, exact read from Firestore: doc(db, "users", currentUser.uid)
    let existingProfile: UserProfile | null = null;
    try {
      const userDocRef = doc(db, "users", googleUid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const data = userSnap.data() as any;
        if (data && (data.role || data.email)) {
          existingProfile = { ...data, uid: googleUid } as UserProfile;
        }
      }
    } catch (err) {
      console.warn("[PROFILE LOOKUP] users/{uid} direct read check:", err);
    }

    // 3. Search pre-registered invite / legacy records by email
    let preRegistered: { data: UserInvite; sourceDocId?: string; sourceCollection?: string } | null = null;
    let matchCount = 0;

    if (cleanEmail) {
      preRegistered = await findPreRegisteredProfileByEmail(rawEmail);
      if (preRegistered) {
        matchCount = 1;
      }
    }

    // 4. Case A: Profile document already exists in users/{googleUid}
    if (existingProfile) {
      console.log(`[PROFILE] UID document exists: true`);

      // If Admin updated a pending assignment while user was offline
      if (preRegistered) {
        const pendingData = preRegistered.data;
        existingProfile.role = pendingData.role || existingProfile.role;
        existingProfile.status = pendingData.status === 'disabled' ? 'disabled' : (pendingData.status || existingProfile.status);
        if (pendingData.schoolId !== undefined) {
          existingProfile.schoolId = pendingData.schoolId ? pendingData.schoolId.trim() : null;
          existingProfile.schoolName = pendingData.schoolName || existingProfile.schoolName;
        }
        existingProfile.displayName = user.displayName || pendingData.displayName || existingProfile.displayName;
        existingProfile.updatedAt = now;
        existingProfile.lastLoginAt = now;

        try {
          await setDoc(doc(db, "users", googleUid), existingProfile, { merge: true });
          await deletePendingUser(cleanEmail);
        } catch (_) {}
      } else {
        // Refresh login timestamp
        try {
          await setDoc(doc(db, "users", googleUid), {
            lastLoginAt: now,
            displayName: user.displayName || existingProfile.displayName,
            photoURL: user.photoURL || existingProfile.photoURL,
          }, { merge: true });
        } catch (_) {}
      }

      console.log(`[PROFILE] Resolved profile document:\nusers/${googleUid}`);
      console.log(`[PROFILE] Resolved UID: ${existingProfile.uid || googleUid}`);
      console.log(`[PROFILE] Role: ${existingProfile.role}`);
      console.log(`[PROFILE] School ID: ${existingProfile.schoolId || 'none'}`);
      return existingProfile;
    }

    // 5. Case B: users/{googleUid} does NOT exist yet
    console.log(`[PROFILE] UID document exists: false`);
    console.log(`[PROFILE] Email fallback query:\nemail == ${cleanEmail}`);
    console.log(`[PROFILE] Email match count: ${matchCount}`);

    if (preRegistered) {
      const pendingData = preRegistered.data;
      const isExplicitlyDisabled = pendingData.status === 'disabled';
      const canonicalProfile: UserProfile = {
        uid: googleUid,
        displayName: user.displayName || pendingData.displayName || cleanEmail.split('@')[0] || "Cán bộ quản lý",
        email: cleanEmail,
        photoURL: user.photoURL || null,
        role: pendingData.role || 'manager',
        status: isExplicitlyDisabled ? 'disabled' : 'active',
        schoolId: pendingData.schoolId ? pendingData.schoolId.trim() : null,
        schoolName: pendingData.schoolName || null,
        createdAt: pendingData.createdAt || now,
        updatedAt: now,
        lastLoginAt: now,
      };

      try {
        // Write canonical profile to users/{googleUid}
        await setDoc(doc(db, "users", googleUid), canonicalProfile, { merge: true });
        // Clean up temporary pending invitation or legacy doc
        await deletePendingUser(cleanEmail);
        if (preRegistered.sourceCollection === "users" && preRegistered.sourceDocId && preRegistered.sourceDocId !== googleUid) {
          await deleteDoc(doc(db, "users", preRegistered.sourceDocId)).catch(() => {});
        }
      } catch (writeErr) {
        console.warn("[USER PROFILE] Write users/{uid} error:", writeErr);
      }

      console.log(`[PROFILE] Resolved profile document:\nusers/${googleUid}`);
      console.log(`[PROFILE] Resolved UID: ${canonicalProfile.uid}`);
      console.log(`[PROFILE] Role: ${canonicalProfile.role}`);
      console.log(`[PROFILE] School ID: ${canonicalProfile.schoolId || 'none'}`);
      return canonicalProfile;
    }

    // 6. Case C: Unauthorized (No existing profile in users/{uid} and no pending invitation found)
    console.warn(`[USER PROFILE] No authorized invite found for email: ${cleanEmail} (UID: ${googleUid})`);
    console.log(`[PROFILE] Resolved profile document: none`);
    console.log(`[PROFILE] Resolved UID: none`);
    console.log(`[PROFILE] Role: none`);
    console.log(`[PROFILE] School ID: none`);
    return null;
  } catch (error: any) {
    console.error("[USER PROFILE] Error syncing profile:", error);
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
      return { ...snap.data(), uid } as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("[USER PROFILE] Error getting profile:", error);
    return null;
  }
}

/**
 * Get all user profiles (Admin only)
 * Aggregates real users from users/{uid} and pending invitations from pendingUsers.
 */
export async function getAllUserProfiles(): Promise<UserProfile[]> {
  try {
    const [usersSnap, pendingSnap, invitesSnap] = await Promise.all([
      getDocs(collection(db, "users")).catch(() => null),
      getDocs(collection(db, "pendingUsers")).catch(() => null),
      getDocs(collection(db, "userInvites")).catch(() => null),
    ]);

    const emailToRealUser = new Map<string, UserProfile>();
    const uidOnlyUsers: UserProfile[] = [];

    if (usersSnap) {
      usersSnap.forEach((d) => {
        const u = { ...d.data(), uid: d.id } as UserProfile;
        const email = (u.email || '').toLowerCase().trim();
        if (email) {
          emailToRealUser.set(email, u);
        } else {
          uidOnlyUsers.push(u);
        }
      });
    }

    const pendingMap = new Map<string, UserInvite>();
    if (pendingSnap) {
      pendingSnap.forEach((d) => {
        const data = d.data() as UserInvite;
        if (data?.email) {
          pendingMap.set(data.email.toLowerCase().trim(), data);
        }
      });
    }
    if (invitesSnap) {
      invitesSnap.forEach((d) => {
        const data = d.data() as UserInvite;
        if (data?.email) {
          const email = data.email.toLowerCase().trim();
          if (!pendingMap.has(email)) {
            pendingMap.set(email, data);
          }
        }
      });
    }

    const resultMap = new Map<string, UserProfile>();

    // 1. Add all real registered users from users/{uid}
    emailToRealUser.forEach((realUser, email) => {
      // If there's a pending assignment that has newer details (e.g. Admin assigned a school while user hadn't logged in), show it
      const pending = pendingMap.get(email);
      if (pending && pending.schoolId && pending.schoolId !== realUser.schoolId) {
        resultMap.set(email, {
          ...realUser,
          schoolId: pending.schoolId,
          schoolName: pending.schoolName || realUser.schoolName,
          role: pending.role || realUser.role,
        });
      } else {
        resultMap.set(email, realUser);
      }
      // Remove from pending map so we don't duplicate
      pendingMap.delete(email);
    });

    // 2. Add pending invitations for users who haven't logged in yet
    pendingMap.forEach((pending, email) => {
      if (!resultMap.has(email)) {
        resultMap.set(email, {
          uid: `pending_${getEmailKey(email)}`,
          displayName: pending.displayName || pending.name || email.split('@')[0],
          email: pending.email,
          photoURL: null,
          role: pending.role || 'manager',
          status: pending.status || 'active',
          schoolId: pending.schoolId || null,
          schoolName: pending.schoolName || null,
          createdAt: pending.createdAt || new Date().toISOString(),
          updatedAt: pending.updatedAt || new Date().toISOString(),
          lastLoginAt: null,
        });
      }
    });

    // 3. Add any UID-only users
    uidOnlyUsers.forEach((u) => {
      if (!resultMap.has(u.uid)) {
        resultMap.set(u.uid, u);
      }
    });

    return Array.from(resultMap.values()).sort((a, b) => 
      (b.createdAt || '').localeCompare(a.createdAt || '')
    );
  } catch (error) {
    console.error("[USER PROFILE] Error fetching all user profiles:", error);
    return [];
  }
}

/**
 * Create user profile by Admin (Admin only)
 * Creates pending invitation in pendingUsers/{cleanEmail}.
 * If the user has already logged in with Google in the past, updates users/{uid} directly.
 */
export async function createUserProfileByAdmin(
  profile: Partial<UserProfile> & { email: string; role: UserRole; schoolId: string | null }
): Promise<boolean> {
  try {
    const cleanEmail = profile.email.trim().toLowerCase();
    if (!cleanEmail) return false;
    const now = new Date().toISOString();

    const pendingData: UserInvite = {
      email: cleanEmail,
      displayName: profile.displayName || cleanEmail.split('@')[0],
      role: profile.role || 'manager',
      status: profile.status || 'active',
      schoolId: profile.schoolId || null,
      schoolName: profile.schoolName || null,
      createdAt: profile.createdAt || now,
      updatedAt: now,
    };

    // 1. Save to pendingUsers and userInvites
    await createPendingUser(pendingData);

    // 2. If user already exists in users collection (by email query), update their real users/{uid} document immediately
    try {
      const q = query(collection(db, "users"), where("email", "==", cleanEmail));
      const snap = await getDocs(q);
      const updates: Promise<any>[] = [];
      snap.forEach((d) => {
        updates.push(setDoc(d.ref, {
          displayName: pendingData.displayName,
          role: pendingData.role,
          status: pendingData.status,
          schoolId: pendingData.schoolId,
          schoolName: pendingData.schoolName,
          updatedAt: now,
        }, { merge: true }));
      });
      await Promise.all(updates);
    } catch (_) {}

    console.log(`[USER PROFILE] Successfully created pending user invitation:`, pendingData);
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
    let targetEmail = updates.email;

    // If uid is a real Firebase UID, read document if email not provided
    if (!targetEmail && !uid.startsWith("pending_") && !uid.startsWith("invite_")) {
      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
          targetEmail = snap.data()?.email;
        }
      } catch (_) {}
    }

    const cleanEmail = targetEmail ? targetEmail.trim().toLowerCase() : '';

    // 1. Update pendingUsers and userInvites if cleanEmail is known
    if (cleanEmail) {
      await updatePendingUser(cleanEmail, {
        ...(updates.role ? { role: updates.role } : {}),
        ...(updates.status ? { status: updates.status } : {}),
        ...(updates.schoolId !== undefined ? { schoolId: updates.schoolId } : {}),
        ...(updates.schoolName !== undefined ? { schoolName: updates.schoolName } : {}),
        ...(updates.displayName ? { displayName: updates.displayName } : {}),
      });
    }

    // 2. If uid is a real Firebase UID, update users/{uid} directly
    if (!uid.startsWith("pending_") && !uid.startsWith("invite_") && !uid.startsWith("auth_")) {
      const userDocRef = doc(db, "users", uid);
      await setDoc(userDocRef, {
        ...updates,
        updatedAt: now,
      }, { merge: true });
    }

    // 3. Also update any user doc matching email
    if (cleanEmail) {
      try {
        const q = query(collection(db, "users"), where("email", "==", cleanEmail));
        const snap = await getDocs(q);
        const promises: Promise<any>[] = [];
        snap.forEach((d) => {
          promises.push(setDoc(d.ref, {
            ...(updates.role ? { role: updates.role } : {}),
            ...(updates.status ? { status: updates.status } : {}),
            ...(updates.schoolId !== undefined ? { schoolId: updates.schoolId } : {}),
            ...(updates.schoolName !== undefined ? { schoolName: updates.schoolName } : {}),
            ...(updates.displayName ? { displayName: updates.displayName } : {}),
            updatedAt: now,
          }, { merge: true }));
        });
        await Promise.all(promises);
      } catch (multiErr) {
        console.warn("[USER PROFILE] Multi-doc sync warning:", multiErr);
      }
    }

    console.log(`[USER PROFILE] Successfully updated user ${uid} / ${cleanEmail}:`, updates);
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
    if (!targetEmail && !uid.startsWith("pending_") && !uid.startsWith("invite_")) {
      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
          targetEmail = snap.data()?.email;
        }
      } catch (_) {}
    }

    const cleanEmail = targetEmail ? targetEmail.trim().toLowerCase() : '';

    // 1. Delete from pendingUsers, userInvites, authorized_users
    if (cleanEmail) {
      await deletePendingUser(cleanEmail);
    }

    // 2. Delete from users collection if real UID
    if (!uid.startsWith("pending_") && !uid.startsWith("invite_")) {
      const userDocRef = doc(db, "users", uid);
      await deleteDoc(userDocRef).catch(() => {});
    }

    // 3. Also delete any other doc in users collection matching email
    if (cleanEmail) {
      try {
        const q = query(collection(db, "users"), where("email", "==", cleanEmail));
        const snap = await getDocs(q);
        const promises: Promise<any>[] = [];
        snap.forEach((d) => {
          promises.push(deleteDoc(d.ref).catch(() => {}));
        });
        await Promise.all(promises);
      } catch (_) {}
    }
    
    console.log(`[USER PROFILE] Successfully deleted user ${uid} / ${cleanEmail}`);
    return true;
  } catch (error: any) {
    console.error(`[USER PROFILE] Error deleting user ${uid}:`, error);
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
 * Luồng chuẩn:
 * Ưu tiên đọc trực tiếp document ID: schools/{cleanSchoolId}
 * Tuyệt đối KHÔNG tìm trường bằng where("code", "==", schoolId) vì code ("SCHOOL_002") và schoolId ("school_002") là 2 trường khác nhau.
 */
export async function getSchool(schoolId: string): Promise<School | null> {
  const cleanSchoolId = (schoolId || "").trim();
  if (!cleanSchoolId) return null;

  try {
    const schoolRef = doc(db, "schools", cleanSchoolId);
    const schoolSnap = await getDoc(schoolRef);

    if (!schoolSnap.exists()) {
      return null;
    }

    const data = schoolSnap.data();
    return {
      id: schoolSnap.id,
      name: data?.name || cleanSchoolId,
      code: data?.code || cleanSchoolId,
      address: data?.address || "",
      createdAt: data?.createdAt || "",
      updatedAt: data?.updatedAt || "",
      ...data,
    } as School;
  } catch (error: any) {
    console.error(`[SCHOOLS] Error fetching school ${cleanSchoolId}:`, {
      operation: "getDoc",
      path: `schools/${cleanSchoolId}`,
      errorCode: error?.code,
      errorMessage: error?.message,
      currentUserUid: auth.currentUser?.uid,
      currentUserEmail: auth.currentUser?.email,
    });
    // Rethrow if permission error so UI can display proper permission-denied alert instead of not_found
    if (error?.code === "permission-denied") {
      throw error;
    }
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

