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
import { UserProfile } from './types';
import { telemetryStore } from './telemetryStore';

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
 * Sign in with Google Popup - Real Google Authentication only (Zero Dummy Accounts)
 */
export async function signInWithGoogle(): Promise<{ success: boolean; user: UserProfile | null; error?: string }> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const profile = firebaseUserToProfile(result.user);
    telemetryStore.setUser(profile);
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
    return { success: true, user: profile };
  } catch (err: any) {
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
    return { success: true, user: profile };
  } catch (err: any) {
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
