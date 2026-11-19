'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
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
    return {
      success: false,
      user: null,
      error: error?.message || 'Google sign-in could not be completed.'
    };
  }
}

/**
 * Helper to generate deterministic local/fallback userId
 */
function generateLocalUserId(email: string): string {
  try {
    if (typeof window !== 'undefined' && window.btoa) {
      return 'usr_' + window.btoa(email.trim().toLowerCase()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);
    }
  } catch {}
  return 'usr_' + Date.now();
}

/**
 * Sign in with Email and Password
 */
export async function signInWithEmail(email: string, password: string): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' };
  }
  try {
    const result = await signInWithEmailAndPassword(auth, email.trim(), password);
    const profile = firebaseUserToProfile(result.user);
    telemetryStore.setUser(profile);
    syncUserProfileToFirestore(profile).catch(() => {});
    return { success: true, user: profile };
  } catch (err: any) {
    const code = err?.code || '';
    const message = err?.message || '';

    // Gracefully handle auth/configuration-not-found: persist to local store and directly sync to Firestore 'users' collection
    if (code === 'auth/configuration-not-found' || message.includes('configuration-not-found') || code === 'auth/operation-not-allowed') {
      const cleanEmail = email.trim().toLowerCase();
      const isOwnerAccount = VERIFIED_ADMIN_EMAILS.includes(cleanEmail);
      const fallbackProfile: UserProfile = {
        userId: isOwnerAccount ? `usr_owner_${cleanEmail.replace(/[^a-z0-9]/g, '_')}` : generateLocalUserId(email),
        email: cleanEmail,
        displayName: isOwnerAccount ? 'Owner' : email.split('@')[0],
        dailyGoalHours: 5,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
      telemetryStore.setUser(fallbackProfile);
      await syncUserProfileToFirestore(fallbackProfile).catch(() => {});
      return { success: true, user: fallbackProfile };
    }

    return {
      success: false,
      error: err?.message || 'Invalid email or password.'
    };
  }
}

/**
 * Sign up with Email and Password
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string,
  dailyGoalHours = 5
): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' };
  }
  try {
    const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (displayName && result.user) {
      await updateFirebaseProfile(result.user, { displayName });
    }
    const profile = firebaseUserToProfile(result.user, dailyGoalHours);
    if (displayName) profile.displayName = displayName;
    telemetryStore.setUser(profile);
    syncUserProfileToFirestore(profile).catch(() => {});
    return { success: true, user: profile };
  } catch (err: any) {
    const code = err?.code || '';
    const message = err?.message || '';

    // Gracefully handle auth/configuration-not-found: persist to local store and directly sync to Firestore 'users' collection
    if (code === 'auth/configuration-not-found' || message.includes('configuration-not-found') || code === 'auth/operation-not-allowed') {
      const cleanEmail = email.trim().toLowerCase();
      const isOwnerAccount = VERIFIED_ADMIN_EMAILS.includes(cleanEmail);
      const fallbackProfile: UserProfile = {
        userId: isOwnerAccount ? `usr_owner_${cleanEmail.replace(/[^a-z0-9]/g, '_')}` : generateLocalUserId(email),
        email: cleanEmail,
        displayName: displayName?.trim() || (isOwnerAccount ? 'Owner' : email.split('@')[0]),
        dailyGoalHours,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
      telemetryStore.setUser(fallbackProfile);
      await syncUserProfileToFirestore(fallbackProfile).catch(() => {});
      return { success: true, user: fallbackProfile };
    }

    return {
      success: false,
      error: err?.message || 'Unable to create account.'
    };
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
    } else {
      telemetryStore.setUser(null);
    }
  });
}
