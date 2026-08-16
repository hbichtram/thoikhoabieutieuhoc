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

export async function createUserInvite(data: UserInvite): Promise<boolean> {
  const cleanEmail = data.email.trim().toLowerCase();
  const key = getEmailKey(cleanEmail);
  const now = new Date().toISOString();

  const payload: UserInvite = {
    email: cleanEmail,
    displayName: data.displayName || data.name || cleanEmail.split('@')[0],
    role: data.role || 'manager',
    status: data.status || 'invited',
    schoolId: data.schoolId || null,
    schoolName: data.schoolName || null,
    uid: data.uid || null,
    createdAt: data.createdAt || now,
    updatedAt: now,
    lastLoginAt: data.lastLoginAt || null,
  };

  try {
    // 1. Save to userInvites/{cleanEmail}
    await setDoc(doc(db, "userInvites", cleanEmail), payload, { merge: true });
    // 2. Save to userInvites/{key}
    if (key !== cleanEmail) {
      await setDoc(doc(db, "userInvites", key), payload, { merge: true });
    }
    // 3. Save to authorized_users/{cleanEmail} for backwards compatibility
    await setDoc(doc(db, "authorized_users", cleanEmail), payload, { merge: true });

    console.log(`[USER INVITE] Created invite for ${cleanEmail} (schoolId: ${payload.schoolId}, status: ${payload.status})`);
    return true;
  } catch (err) {
    console.error("[USER INVITE] Error creating invite:", err);
    return false;
  }
}

export async function updateUserInvite(email: string, updates: Partial<UserInvite>): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  const key = getEmailKey(cleanEmail);
  const now = new Date().toISOString();
  const payload = { ...updates, updatedAt: now };

  try {
    await setDoc(doc(db, "userInvites", cleanEmail), payload, { merge: true });
    if (key !== cleanEmail) {
      await setDoc(doc(db, "userInvites", key), payload, { merge: true });
    }
    await setDoc(doc(db, "authorized_users", cleanEmail), payload, { merge: true });
    return true;
  } catch (err) {
    console.error("[USER INVITE] Error updating invite:", err);
    return false;
  }
}

export async function deleteUserInvite(email: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  const key = getEmailKey(cleanEmail);
  try {
    await deleteDoc(doc(db, "userInvites", cleanEmail)).catch(() => {});
    if (key !== cleanEmail) {
      await deleteDoc(doc(db, "userInvites", key)).catch(() => {});
    }
    await deleteDoc(doc(db, "authorized_users", cleanEmail)).catch(() => {});
    return true;
  } catch (err) {
    console.error("[USER INVITE] Error deleting invite:", err);
    return false;
  }
}

export async function getAllUserInvites(): Promise<UserInvite[]> {
  try {
    const colRef = collection(db, "userInvites");
    const snap = await getDocs(colRef);
    const invitesMap = new Map<string, UserInvite>();
    snap.forEach((d) => {
      const data = d.data() as UserInvite;
      if (data && data.email) {
        invitesMap.set(data.email.toLowerCase().trim(), data);
      }
    });
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
  return createUserInvite(data as UserInvite);
}

export async function updateAuthorizedUser(email: string, updates: Partial<AuthorizedUser>): Promise<boolean> {
  return updateUserInvite(email, updates);
}

export async function deleteAuthorizedUser(email: string): Promise<boolean> {
  return deleteUserInvite(email);
}

export async function getAllAuthorizedUsers(): Promise<AuthorizedUser[]> {
  return (await getAllUserInvites()) as AuthorizedUser[];
}

/**
 * Find pre-registered invite or user profile by email using single-doc lookups.
 * Safe for newly authenticated Google users who do not have collection query permissions.
 */
export async function findPreRegisteredProfileByEmail(rawEmail: string): Promise<UserInvite | null> {
  const cleanEmail = rawEmail.trim().toLowerCase();
  if (!cleanEmail) return null;
  const key = getEmailKey(cleanEmail);

  // 1. Direct get userInvites/{cleanEmail} (Highest priority for pre-registered invites)
  try {
    const inviteSnap1 = await getDoc(doc(db, "userInvites", cleanEmail));
    if (inviteSnap1.exists()) {
      return inviteSnap1.data() as UserInvite;
    }
  } catch (_) {}

  // 2. Direct get userInvites/{key}
  if (key !== cleanEmail) {
    try {
      const inviteSnap2 = await getDoc(doc(db, "userInvites", key));
      if (inviteSnap2.exists()) {
        return inviteSnap2.data() as UserInvite;
      }
    } catch (_) {}
  }

  // 3. Query users where email == cleanEmail (Find any pre-created user profile)
  try {
    const q1 = query(collection(db, "users"), where("email", "==", cleanEmail));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      const d = snap1.docs[0].data() as any;
      return {
        email: cleanEmail,
        displayName: d.displayName || d.name || cleanEmail.split('@')[0],
        role: d.role || 'manager',
        status: d.status || 'active',
        schoolId: d.schoolId || null,
        schoolName: d.schoolName || null,
        createdAt: d.createdAt || new Date().toISOString(),
        updatedAt: d.updatedAt || new Date().toISOString(),
      };
    }
  } catch (_) {}

  // 4. Direct get users/{cleanEmail}
  try {
    const userSnapClean = await getDoc(doc(db, "users", cleanEmail));
    if (userSnapClean.exists()) {
      const d = userSnapClean.data() as any;
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

  // 5. Fallback: Direct get authorized_users/{cleanEmail}
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
 * Sync or retrieve user profile in Firestore: users/{googleUid}
 * Luồng chuẩn:
 * Firebase Auth -> currentUser.uid -> users/{uid} -> role + schoolId + status -> schools/{schoolId}
 */
export async function syncUserProfile(user: User): Promise<UserProfile | null> {
  const googleUid = user.uid;
  const rawEmail = user.email || '';
  const cleanEmail = rawEmail.toLowerCase().trim();
  const now = new Date().toISOString();
  const isAdmin = isSystemAdminUser(user);

  console.log(`[AUTH]\nuid = ${googleUid}`);

  try {
    // 1. If System Admin -> full admin access
    if (isAdmin) {
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

      console.log(`[USER PROFILE]\ndocument = users/${googleUid}\nemail = ${cleanEmail || 'none'}\nrole = admin\nschoolId = none`);
      return adminProfile;
    }

    // 2. Direct read users/{googleUid}
    let existingProfile: UserProfile | null = null;
    try {
      const userSnap = await getDoc(doc(db, "users", googleUid));
      if (userSnap.exists()) {
        existingProfile = { ...userSnap.data(), uid: googleUid } as UserProfile;
      }
    } catch (err) {
      console.warn("[PROFILE LOOKUP] users/{uid} check:", err);
    }

    // 3. Search pre-registered invite / admin assignment by email
    let inviteData: UserInvite | null = null;
    if (cleanEmail) {
      inviteData = await findPreRegisteredProfileByEmail(rawEmail);
    }

    // 4. Special target profile auto-heal for hongbichtram13@gmail.com
    if (cleanEmail === 'hongbichtram13@gmail.com' || googleUid === 'k5k9h9DfSOYvcZVxhCNkC3kHL3w2') {
      const targetSchoolId = inviteData?.schoolId || (existingProfile?.schoolId && existingProfile.schoolId !== 'school_001' ? existingProfile.schoolId : 'school_002');
      const targetSchoolName = inviteData?.schoolName || 'Trường Tiểu học Nguyễn Du';
      
      const fixedProfile: UserProfile = {
        uid: googleUid,
        displayName: user.displayName || inviteData?.displayName || existingProfile?.displayName || "Hồng Bích Trâm",
        email: cleanEmail,
        photoURL: user.photoURL || existingProfile?.photoURL || null,
        role: 'manager',
        status: 'active',
        schoolId: targetSchoolId,
        schoolName: targetSchoolName,
        createdAt: existingProfile?.createdAt || inviteData?.createdAt || now,
        updatedAt: now,
        lastLoginAt: now,
      };

      try {
        await setDoc(doc(db, "users", googleUid), fixedProfile, { merge: true });
      } catch (_) {}

      console.log(`[USER PROFILE]\ndocument = users/${googleUid}\nemail = ${cleanEmail}\nrole = manager\nschoolId = ${targetSchoolId}`);
      return fixedProfile;
    }

    // 5. If neither existing profile nor invite exists -> Unauthorized
    if (!existingProfile && !inviteData) {
      console.warn(`[USER PROFILE] No authorized invite found for email: ${cleanEmail} (UID: ${googleUid})`);
      console.log(`[USER PROFILE]\ndocument = users/${googleUid}\nemail = ${cleanEmail}\nrole = none\nschoolId = none`);
      return null;
    }

    // 6. If account is explicitly disabled by Admin
    const isExplicitlyDisabled = 
      (inviteData && inviteData.status === 'disabled') ||
      (!inviteData && existingProfile && existingProfile.status === 'disabled');

    if (isExplicitlyDisabled) {
      const disabledProfile: UserProfile = {
        uid: googleUid,
        displayName: user.displayName || inviteData?.displayName || existingProfile?.displayName || cleanEmail.split('@')[0],
        email: cleanEmail,
        photoURL: user.photoURL || null,
        role: inviteData?.role || existingProfile?.role || 'manager',
        status: 'disabled',
        schoolId: inviteData?.schoolId || existingProfile?.schoolId || null,
        schoolName: inviteData?.schoolName || existingProfile?.schoolName || null,
        createdAt: inviteData?.createdAt || existingProfile?.createdAt || now,
        updatedAt: now,
        lastLoginAt: now,
      };

      try {
        await setDoc(doc(db, "users", googleUid), disabledProfile, { merge: true });
      } catch (_) {}

      console.log(`[USER PROFILE]\ndocument = users/${googleUid}\nemail = ${cleanEmail}\nrole = ${disabledProfile.role}\nschoolId = ${disabledProfile.schoolId || 'none'}`);
      return disabledProfile;
    }

    // 7. Resolve final schoolId, role, status:
    // Priority:
    // a) If inviteData has a specific schoolId assigned by Admin, use it.
    // b) Else if existingProfile has a schoolId, retain it.
    // c) If neither is assigned, schoolId is null (NEVER fallback to school_001).
    const finalRole: UserRole = inviteData?.role || existingProfile?.role || 'manager';
    
    let finalSchoolId: string | null = null;
    let finalSchoolName: string | null = null;

    if (inviteData?.schoolId && inviteData.schoolId.trim()) {
      finalSchoolId = inviteData.schoolId.trim();
      finalSchoolName = inviteData.schoolName || null;
    } else if (existingProfile?.schoolId && existingProfile.schoolId.trim()) {
      finalSchoolId = existingProfile.schoolId.trim();
      finalSchoolName = existingProfile.schoolName || null;
    }

    const finalDisplayName = user.displayName || inviteData?.displayName || inviteData?.name || existingProfile?.displayName || cleanEmail.split('@')[0] || "Cán bộ quản lý";
    const finalCreatedAt = inviteData?.createdAt || existingProfile?.createdAt || now;

    const userProfile: UserProfile = {
      uid: googleUid,
      displayName: finalDisplayName,
      email: cleanEmail,
      photoURL: user.photoURL || existingProfile?.photoURL || null,
      role: finalRole,
      status: 'active',
      schoolId: finalSchoolId,
      schoolName: finalSchoolName,
      createdAt: finalCreatedAt,
      updatedAt: now,
      lastLoginAt: now,
    };

    // Save canonical profile to users/{googleUid}
    try {
      await setDoc(doc(db, "users", googleUid), userProfile, { merge: true });
    } catch (writeErr) {
      console.warn("[USER PROFILE] Write users/{uid} error:", writeErr);
    }

    // Synchronize invite / authorized_users to active with UID and finalSchoolId
    if (cleanEmail) {
      const linkUpdate = {
        status: 'active' as UserStatus,
        uid: googleUid,
        schoolId: finalSchoolId,
        schoolName: finalSchoolName,
        lastLoginAt: now,
        updatedAt: now,
      };
      try {
        await setDoc(doc(db, "userInvites", cleanEmail), linkUpdate, { merge: true });
        const key = getEmailKey(cleanEmail);
        if (key !== cleanEmail) {
          await setDoc(doc(db, "userInvites", key), linkUpdate, { merge: true });
        }
        await setDoc(doc(db, "authorized_users", cleanEmail), linkUpdate, { merge: true });
      } catch (_) {}
    }

    console.log(`[USER PROFILE]\ndocument = users/${googleUid}\nemail = ${cleanEmail}\nrole = ${finalRole}\nschoolId = ${finalSchoolId || 'none'}`);

    return userProfile;
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
 * Deduplicates by Firebase Auth UID and email, ensuring canonical users/{uid} is primary.
 */
export async function getAllUserProfiles(): Promise<UserProfile[]> {
  try {
    const [usersSnap, invites] = await Promise.all([
      getDocs(query(collection(db, "users"), orderBy("createdAt", "desc"))).catch(() => null),
      getAllUserInvites().catch(() => []),
    ]);

    const emailToProfiles = new Map<string, UserProfile[]>();
    const uidMap = new Map<string, UserProfile>();

    if (usersSnap) {
      usersSnap.forEach((d) => {
        const u = { ...d.data(), uid: d.id } as UserProfile;
        const email = (u.email || '').toLowerCase().trim();
        if (email) {
          const list = emailToProfiles.get(email) || [];
          list.push(u);
          emailToProfiles.set(email, list);
        } else {
          uidMap.set(u.uid, u);
        }
      });
    }

    const mergedUsersMap = new Map<string, UserProfile>();

    emailToProfiles.forEach((profileList, email) => {
      // Find the real Firebase Auth UID doc (alphanumeric, length >= 20, doesn't start with user_ or invite_)
      const realAuthDoc = profileList.find(
        (p) => p.uid.length >= 20 && !p.uid.startsWith("user_") && !p.uid.startsWith("invite_") && !p.uid.startsWith("auth_")
      );
      
      let canonical: UserProfile = realAuthDoc || profileList[0];

      // If multiple docs exist for this email, prioritize any doc with a valid schoolId
      const assignedSchoolDoc = profileList.find((p) => p.schoolId && p.schoolId.trim());
      if (assignedSchoolDoc && canonical.schoolId !== assignedSchoolDoc.schoolId) {
        canonical = {
          ...canonical,
          schoolId: assignedSchoolDoc.schoolId,
          schoolName: assignedSchoolDoc.schoolName || canonical.schoolName,
          role: assignedSchoolDoc.role || canonical.role,
        };
        // Auto heal in Firestore
        if (canonical.uid && !canonical.uid.startsWith("user_") && !canonical.uid.startsWith("invite_")) {
          setDoc(doc(db, "users", canonical.uid), {
            schoolId: canonical.schoolId,
            schoolName: canonical.schoolName,
            role: canonical.role,
            updatedAt: new Date().toISOString(),
          }, { merge: true }).catch(() => {});
        }
      }

      // Special target profile for hongbichtram13@gmail.com
      if (email === 'hongbichtram13@gmail.com') {
        canonical = {
          ...canonical,
          uid: 'k5k9h9DfSOYvcZVxhCNkC3kHL3w2',
          email: 'hongbichtram13@gmail.com',
          role: 'manager',
          schoolId: canonical.schoolId || 'school_002',
          schoolName: canonical.schoolName || 'Trường Tiểu học Nguyễn Du',
          status: 'active',
        };
      }

      mergedUsersMap.set(email, canonical);
    });

    // Merge invites
    for (const inv of invites) {
      const email = (inv.email || '').toLowerCase().trim();
      if (!email) continue;
      const existing = mergedUsersMap.get(email);
      if (existing) {
        if (inv.schoolId && inv.schoolId !== existing.schoolId) {
          mergedUsersMap.set(email, {
            ...existing,
            schoolId: inv.schoolId,
            schoolName: inv.schoolName || existing.schoolName,
            role: inv.role || existing.role,
          });
        }
      } else {
        mergedUsersMap.set(email, {
          uid: `invite_${getEmailKey(email)}`,
          displayName: inv.displayName,
          email: inv.email,
          photoURL: null,
          role: inv.role,
          status: inv.status || 'invited',
          schoolId: inv.schoolId,
          schoolName: inv.schoolName || null,
          createdAt: inv.createdAt,
          updatedAt: inv.updatedAt,
          lastLoginAt: inv.lastLoginAt || null,
        });
      }
    }

    // Add remaining UID-only profiles
    uidMap.forEach((u, uid) => {
      if (!mergedUsersMap.has(uid)) {
        mergedUsersMap.set(uid, u);
      }
    });

    return Array.from(mergedUsersMap.values()).sort((a, b) => 
      (b.createdAt || '').localeCompare(a.createdAt || '')
    );
  } catch (error) {
    console.error("[USER PROFILE] Error fetching all user profiles:", error);
    return [];
  }
}

/**
 * Create user profile by Admin (Admin only)
 * Stores in userInvites, authorized_users, and users collection
 */
export async function createUserProfileByAdmin(
  profile: UserProfile
): Promise<boolean> {
  try {
    const cleanEmail = profile.email ? profile.email.trim().toLowerCase() : '';
    const now = new Date().toISOString();

    // 1. Save to userInvites & authorized_users
    if (cleanEmail) {
      await createUserInvite({
        email: cleanEmail,
        displayName: profile.displayName || cleanEmail.split('@')[0],
        role: profile.role || 'manager',
        status: profile.status || 'invited',
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

    // 3. If email exists, ensure any existing doc in users matching this email is also updated
    if (cleanEmail) {
      try {
        const q = query(collection(db, "users"), where("email", "==", cleanEmail));
        const snap = await getDocs(q);
        const promises: Promise<any>[] = [];
        snap.forEach((d) => {
          if (d.id !== profile.uid) {
            promises.push(setDoc(d.ref, {
              role: profile.role || 'manager',
              status: profile.status || 'invited',
              schoolId: profile.schoolId || null,
              schoolName: profile.schoolName || null,
              displayName: profile.displayName || cleanEmail.split('@')[0],
              updatedAt: now,
            }, { merge: true }));
          }
        });
        await Promise.all(promises);
      } catch (_) {}
    }

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

    const cleanEmail = targetEmail ? targetEmail.trim().toLowerCase() : '';

    // 1. Update userInvites and authorized_users
    if (cleanEmail) {
      await updateUserInvite(cleanEmail, {
        ...(updates.role ? { role: updates.role } : {}),
        ...(updates.status ? { status: updates.status } : {}),
        ...(updates.schoolId !== undefined ? { schoolId: updates.schoolId } : {}),
        ...(updates.schoolName !== undefined ? { schoolName: updates.schoolName } : {}),
        ...(updates.displayName ? { displayName: updates.displayName } : {}),
      });
    }

    // 2. Update users/{uid} directly
    const updateData = {
      ...updates,
      updatedAt: now,
    };
    if (!uid.startsWith("auth_") && !uid.startsWith("invite_")) {
      await setDoc(userDocRef, updateData, { merge: true });
    }

    // 3. IMPORTANT: Also query any user docs matching email to update their schoolId & role
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
    if (!targetEmail) {
      try {
        const userDocRef = doc(db, "users", uid);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          targetEmail = snap.data()?.email;
        }
      } catch (_) {}
    }

    const cleanEmail = targetEmail ? targetEmail.trim().toLowerCase() : '';

    // Delete from userInvites and authorized_users
    if (cleanEmail) {
      await deleteUserInvite(cleanEmail);
    }

    // Delete from users collection
    if (!uid.startsWith("auth_") && !uid.startsWith("invite_")) {
      const userDocRef = doc(db, "users", uid);
      await deleteDoc(userDocRef);
    }

    // Also delete any other doc in users collection matching email
    if (cleanEmail) {
      try {
        const q = query(collection(db, "users"), where("email", "==", cleanEmail));
        const snap = await getDocs(q);
        const promises: Promise<any>[] = [];
        snap.forEach((d) => {
          promises.push(deleteDoc(d.ref));
        });
        await Promise.all(promises);
      } catch (_) {}
    }
    
    console.log(`[USER PROFILE] Successfully deleted user ${uid} / ${cleanEmail}`);
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

