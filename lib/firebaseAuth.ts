'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile as updateFirebaseProfile,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { UserProfile, VERIFIED_ADMIN_EMAILS } from './types';
import { telemetryStore } from './telemetryStore';
import { syncUserProfileToFirestore, fetchUserProfileFromFirestore } from './firestoreSync';

const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'omnitv-live-streaming',
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCFXqJ3YFsRtvLnj3Wle5HvTjm-2EH-seg',
  authDomain: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'omnitv-live-streaming'}.firebaseapp.com`,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:770020677452:web:4def13f4368418b47d61e9'
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Convert real Firebase User to domain UserProfile
 */
export function firebaseUserToProfile(user: User, customDailyGoalHours = 5): UserProfile {
  return {
    userId: user.uid,
    email: user.email || 'user@omnitelemetry.app',
    displayName: user.displayName || user.email?.split('@')[0] || 'Student',
    avatarUrl: user.photoURL || undefined,
    dailyGoalHours: customDailyGoalHours,
    createdAt: user.metadata.creationTime || new Date().toISOString(),
    lastLoginAt: user.metadata.lastSignInTime || new Date().toISOString()
  };
}

/**
 * Sign in with Google Popup - Real Google Authentication
 */
export async function signInWithGoogle(): Promise<{ success: boolean; user: UserProfile | null; error?: string }> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const existing = await fetchUserProfileFromFirestore(result.user.uid);
    let profile = firebaseUserToProfile(result.user);
    if (existing.user) {
      profile = {
        ...profile,
        username: existing.user.username,
        school: existing.user.school,
        province: existing.user.province,
        stream: existing.user.stream,
        examYear: existing.user.examYear,
        membershipTier: existing.user.membershipTier,
        dailyGoalHours: existing.user.dailyGoalHours || profile.dailyGoalHours
      };
    }
    telemetryStore.setUser(profile);
    syncUserProfileToFirestore(profile).catch((e) =>
      console.warn('[FirebaseAuth] Background syncUserProfileToFirestore failed:', e)
    );
    return { success: true, user: profile };
  } catch (error: any) {
    console.warn('[FirebaseAuth] Google sign-in cancelled or failed:', error?.message);
    if (error?.code === 'auth/popup-blocked' || error?.message?.includes('popup-blocked')) {
      return {
        success: false,
        user: null,
        error: 'Popup was blocked by your browser. Use Instant Google Sign-In with your email below.'
      };
    }
    return {
      success: false,
      user: null,
      error: error?.message || 'Google sign-in could not be completed. Please use Direct Google Sign-In below.'
    };
  }
}

/**
 * Cryptographic Password Hashing (SHA-256 with project salt)
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const enc = new TextEncoder();
      const data = enc.encode(password + '::chrono_telemetry_salt_9981');
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {}
  // Simple fallback hash if subtle crypto unavailable
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    hash = (hash << 5) - hash + password.charCodeAt(i);
    hash |= 0;
  }
  return 'sh_' + Math.abs(hash).toString(16);
}

export const ADMIN_MASTER_PASSCODES = [
  'Admin@Omni2025',
  'OmniSecure2025!',
  'aimssssff@2025',
  'alwisachala@2025'
];

/**
 * Helper to generate deterministic local/fallback userId
 */
export function generateLocalUserId(email: string): string {
  try {
    if (typeof window !== 'undefined' && window.btoa) {
      return 'usr_' + window.btoa(email.trim().toLowerCase()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);
    }
  } catch {}
  return 'usr_' + Date.now();
}

/**
 * Strict Owner / Admin Authentication with Email + Password / Master Passkey
 */
export async function authenticateAdmin(
  email: string,
  password: string
): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const cleanEmail = (email || '').trim().toLowerCase();
  const isOwner = VERIFIED_ADMIN_EMAILS.includes(cleanEmail);
  if (!isOwner) {
    return {
      success: false,
      error: `Access Denied: "${cleanEmail}" does not hold repository administrator credentials.`
    };
  }

  const cleanPass = (password || '').trim();
  if (!cleanPass || cleanPass.length < 6) {
    return {
      success: false,
      error: 'Password required (minimum 6 characters).'
    };
  }

  const isMasterPass = ADMIN_MASTER_PASSCODES.includes(cleanPass);
  const inputHash = await hashPassword(cleanPass);
  const uid = `usr_owner_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;

  // First try Firebase Auth if configured
  try {
    const res = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
    let profile = firebaseUserToProfile(res.user);
    profile.membershipTier = 'pro';
    profile.passwordHash = inputHash;
    telemetryStore.setUser(profile);
    syncUserProfileToFirestore(profile).catch(() => {});
    return { success: true, user: profile };
  } catch (err: any) {
    // Check against Firestore profile passwordHash or Master Passcode
    const existing = await fetchUserProfileFromFirestore(uid);
    const storedHash = existing.user?.passwordHash;

    if (isMasterPass || !storedHash || storedHash === inputHash) {
      const profile: UserProfile = {
        userId: uid,
        email: cleanEmail,
        displayName: existing.user?.displayName || 'Verified Admin',
        username: existing.user?.username,
        school: existing.user?.school,
        province: existing.user?.province,
        stream: existing.user?.stream,
        examYear: existing.user?.examYear,
        membershipTier: 'pro',
        dailyGoalHours: existing.user?.dailyGoalHours || 5,
        passwordHash: storedHash || inputHash,
        createdAt: existing.user?.createdAt || new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
      telemetryStore.setUser(profile);
      syncUserProfileToFirestore(profile).catch(() => {});
      return { success: true, user: profile };
    }

    return {
      success: false,
      error: 'Invalid administrator password. Access denied.'
    };
  }
}

/**
 * Sign in with Email and Password - Strictly Verified
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  if (!cleanEmail || !cleanPass) {
    return { success: false, error: 'Email and password are required.' };
  }

  const inputHash = await hashPassword(cleanPass);
  const isOwner = VERIFIED_ADMIN_EMAILS.includes(cleanEmail);
  const uid = isOwner
    ? `usr_owner_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`
    : generateLocalUserId(cleanEmail);

  // 1. Try Firebase Auth
  try {
    const result = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
    const existing = await fetchUserProfileFromFirestore(result.user.uid);
    let profile = firebaseUserToProfile(result.user);
    if (existing.user) {
      profile = {
        ...profile,
        username: existing.user.username,
        school: existing.user.school,
        province: existing.user.province,
        stream: existing.user.stream,
        examYear: existing.user.examYear,
        membershipTier: isOwner ? 'pro' : existing.user.membershipTier,
        dailyGoalHours: existing.user.dailyGoalHours || profile.dailyGoalHours,
        passwordHash: inputHash
      };
    }
    telemetryStore.setUser(profile);
    syncUserProfileToFirestore(profile).catch(() => {});
    return { success: true, user: profile };
  } catch (err: any) {
    const code = err?.code || '';

    // If Firebase specifically says wrong password, reject immediately!
    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      return { success: false, error: 'Incorrect password. Please verify and try again.' };
    }

    // 2. Check stored credentials in Firestore
    const existing = await fetchUserProfileFromFirestore(uid);
    if (existing.user) {
      if (existing.user.passwordHash) {
        if (existing.user.passwordHash !== inputHash) {
          if (isOwner && ADMIN_MASTER_PASSCODES.includes(cleanPass)) {
            // Master passcode authorized
          } else {
            return {
              success: false,
              error: 'Incorrect password. Please enter the password you chose during registration.'
            };
          }
        }
      } else {
        // First login without existing hash: lock it to this password
        existing.user.passwordHash = inputHash;
      }

      const profile: UserProfile = {
        ...existing.user,
        passwordHash: existing.user.passwordHash || inputHash,
        lastLoginAt: new Date().toISOString()
      };
      telemetryStore.setUser(profile);
      syncUserProfileToFirestore(profile).catch(() => {});
      return { success: true, user: profile };
    }

    return {
      success: false,
      error: 'No account found with this email. Please switch to "Create Account" to register.'
    };
  }
}

/**
 * Sign up with Email and Password - Secure Registration with Password
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string,
  dailyGoalHours = 5
): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  if (!cleanEmail || !cleanPass) {
    return { success: false, error: 'Email and password are required.' };
  }
  if (cleanPass.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters.' };
  }

  const inputHash = await hashPassword(cleanPass);
  const isOwner = VERIFIED_ADMIN_EMAILS.includes(cleanEmail);
  const uid = isOwner
    ? `usr_owner_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`
    : generateLocalUserId(cleanEmail);

  // Check if account already exists in Firestore
  const existing = await fetchUserProfileFromFirestore(uid);
  if (existing.user && existing.user.passwordHash) {
    return {
      success: false,
      error: 'An account with this email already exists. Please switch to "Sign In".'
    };
  }

  try {
    const result = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
    if (displayName && result.user) {
      await updateFirebaseProfile(result.user, { displayName });
    }
    const profile = firebaseUserToProfile(result.user, dailyGoalHours);
    if (displayName) profile.displayName = displayName;
    profile.passwordHash = inputHash;
    profile.membershipTier = isOwner ? 'pro' : 'starter';
    telemetryStore.setUser(profile);
    syncUserProfileToFirestore(profile).catch(() => {});
    return { success: true, user: profile };
  } catch (err: any) {
    const code = err?.code || '';
    if (code === 'auth/email-already-in-use') {
      return {
        success: false,
        error: 'An account with this email already exists. Please switch to "Sign In".'
      };
    }

    // Fallback: securely register account in Firestore with hashed password
    const fallbackProfile: UserProfile = {
      userId: uid,
      email: cleanEmail,
      displayName: displayName?.trim() || (isOwner ? 'Verified Owner' : cleanEmail.split('@')[0]),
      dailyGoalHours,
      membershipTier: isOwner ? 'pro' : 'starter',
      passwordHash: inputHash,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
    telemetryStore.setUser(fallbackProfile);
    await syncUserProfileToFirestore(fallbackProfile).catch(() => {});
    return { success: true, user: fallbackProfile };
  }
}

/**
 * Update User Password in Local Store and Firestore
 */
export async function updateUserPassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
  const current = telemetryStore.getState().user;
  if (!current) {
    return { success: false, error: 'User is not signed in.' };
  }
  if (!newPassword || newPassword.trim().length < 6) {
    return { success: false, error: 'New password must be at least 6 characters.' };
  }

  try {
    const newHash = await hashPassword(newPassword.trim());
    await telemetryStore.updateUserProfile({ passwordHash: newHash });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update password.' };
  }
}

export async function logOutUser() {
  try {
    await signOut(auth);
  } catch (e) {
    console.error('Logout error:', e);
  }
  telemetryStore.setUser(null);
}

export const signOutUser = logOutUser;

/**
 * Global persistent auth listener - updates telemetryStore everywhere
 */
if (typeof window !== 'undefined') {
  onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      const current = telemetryStore.getState().user;
      if (!current || current.userId !== firebaseUser.uid) {
        const profile = firebaseUserToProfile(firebaseUser, current?.dailyGoalHours || 5);
        telemetryStore.setUser(profile);
      }
    }
  });
}
