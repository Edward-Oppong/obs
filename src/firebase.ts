import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { INITIAL_TEAM_ROSTER } from './constants';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Cloud Firestore with the custom database ID provisioned for this applet
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Check if an email is in the approved team allowlist
export function isEmailAllowed(email: string | null | undefined, dynamicEmails: string[] = []): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  const staticEmails = [
    'christapostolicchurchbubiashie@gmail.com',
    'intern1@hospital.edu',
    'intern2@hospital.edu',
    'intern3@hospital.edu',
    'intern4@hospital.edu',
    'intern5@hospital.edu',
    'intern6@hospital.edu',
    'intern7@hospital.edu',
    'intern8@hospital.edu',
    ...INITIAL_TEAM_ROSTER.map((m) => m.email.toLowerCase().trim()),
  ];
  return (
    staticEmails.includes(clean) ||
    dynamicEmails.map((e) => e.toLowerCase().trim()).includes(clean)
  );
}

// Passwordless Sign-in helper: Signs in an intern using solely their email without requiring a password
export async function signInWithEmailOnly(email: string, name?: string): Promise<User> {
  const cleanEmail = email.toLowerCase().trim();
  // Safe deterministic internal secret based on email
  const primaryPassword = `Intern2026!_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '')}`;
  const fallbackPassword = 'Intern2026!';

  // Helper to ensure user doc exists in team_members
  const ensureMemberRecord = async (u: User) => {
    try {
      const userRef = doc(db, 'team_members', u.uid);
      await setDoc(
        userRef,
        {
          uid: u.uid,
          email: u.email?.toLowerCase().trim() || cleanEmail,
          displayName: u.displayName || name || cleanEmail.split('@')[0],
          lastLoginAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Could not record team_members profile:', e);
    }
  };

  try {
    // Attempt signing in with primary deterministic password
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, primaryPassword);
    if (name && (!cred.user.displayName || cred.user.displayName !== name)) {
      await updateProfile(cred.user, { displayName: name });
    }
    await ensureMemberRecord(cred.user);
    return cred.user;
  } catch (err: any) {
    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
      // First try fallback password in case account was created previously with 'Intern2026!'
      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, fallbackPassword);
        if (name && (!cred.user.displayName || cred.user.displayName !== name)) {
          await updateProfile(cred.user, { displayName: name });
        }
        await ensureMemberRecord(cred.user);
        return cred.user;
      } catch (fallbackErr: any) {
        // If account doesn't exist, create it automatically!
        if (
          fallbackErr.code === 'auth/user-not-found' ||
          fallbackErr.code === 'auth/invalid-credential' ||
          err.code === 'auth/user-not-found'
        ) {
          const newCred = await createUserWithEmailAndPassword(auth, cleanEmail, primaryPassword);
          const displayName = name || cleanEmail.split('@')[0];
          await updateProfile(newCred.user, { displayName });
          await ensureMemberRecord(newCred.user);
          return newCred.user;
        }
        throw fallbackErr;
      }
    }
    throw err;
  }
}

export {
  signInWithPopup,
  fbSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  addDoc,
  updateDoc,
  deleteDoc,
};
export type { User };
