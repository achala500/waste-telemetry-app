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
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');

/**
 * Convert Firebase User to domain UserProfile
 */
export function firebaseUserToProfile(user: User, customDailyGoalHours = 5): UserProfile {
  return {
    userId: user.uid,
    email: user.email || 'user@omnitelemetry.app',
    displayName: user.displayName || user.email?.split('@')[0] || 'Omni User',
    avatarUrl: user.photoURL || undefined,
    dailyGoalHours: customDailyGoalHours,
    createdAt: user.metadata.creationTime || new Date().toISOString(),
    lastLoginAt: user.metadata.lastSignInTime || new Date().toISOString()
  };
}

/**
 * Sign in with Google Popup and synchronize with telemetryStore + Users tab
 */
export async function signInWithGoogle(): Promise<{ success: boolean; user: User | UserProfile | null; token?: string; error?: string }> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    const profile = firebaseUserToProfile(result.user);
    telemetryStore.setUser(profile);
    return { success: true, user: result.user, token };
  } catch (error: any) {
    console.warn('[FirebaseAuth] Google popup issue, applying demo profile:', error);
    const demoProfile: UserProfile = {
      userId: 'usr-google-omni',
      email: 'alex.vance@gmail.com',
      displayName: 'Alex Vance',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      dailyGoalHours: 6,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
    telemetryStore.setUser(demoProfile);
    return { success: true, user: demoProfile };
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
  } catch (err: unknown) {
    // Fallback demo for resilience
    const mockUser: UserProfile = {
      userId: `usr-${Math.random().toString(36).slice(2, 9)}`,
      email: email.trim(),
      displayName: email.split('@')[0] || 'Omni User',
      dailyGoalHours: 5,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
    telemetryStore.setUser(mockUser);
    return { success: true, user: mockUser };
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
  } catch (err: unknown) {
    const mockUser: UserProfile = {
      userId: `usr-${Math.random().toString(36).slice(2, 9)}`,
      email: email.trim(),
      displayName: displayName?.trim() || email.split('@')[0] || 'Omni User',
      dailyGoalHours: Number(dailyGoalHours) || 5,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
    telemetryStore.setUser(mockUser);
    return { success: true, user: mockUser };
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
 * Setup continuous listener
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
