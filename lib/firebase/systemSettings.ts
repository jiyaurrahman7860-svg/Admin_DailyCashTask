/**
 * System Settings Service
 * 
 * This module provides functions to interact with system_settings collection
 * in Firestore. It handles:
 * - User Panel Control settings (page visibility)
 * - Platform Controls settings (maintenance mode, announcements, etc.)
 * 
 * Only admin users can write to these settings.
 * All authenticated users can read settings for UI rendering decisions.
 */

import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from './config';

// Collection and document references
const SYSTEM_SETTINGS_COLLECTION = 'system_settings';
const USER_PANEL_CONTROLS_DOC = 'user_panel_controls';
const PLATFORM_CONTROLS_DOC = 'platform_controls';

/**
 * Type definitions for User Panel Controls
 */
export interface UserPanelControls {
  dashboard: boolean;
  tasks: boolean;
  myTasks: boolean;
  wallet: boolean;
  withdraw: boolean;
  referral: boolean;
  friendLeaderboard: boolean;
  rewards: boolean;
  rewardAds: boolean;
  leaderboard: boolean;
  contest: boolean;
  downloadApp: boolean;
  support: boolean;
  profile: boolean;
  quickLinks: boolean;
  login: boolean;
  signUp: boolean;
  blog: boolean;
  howItWorks: boolean;
  contact: boolean;
  legal: boolean;
  privacyPolicy: boolean;
  termsOfService: boolean;
  aboutUs: boolean;
  [key: string]: boolean;
}

export interface PlatformControls {
  maintenanceMode: boolean;
  announcementEnabled: boolean;
  announcementMessage: string;
  tasksSystemEnabled: boolean;
  withdrawSystemEnabled: boolean;
  [key: string]: boolean | string;
}

/**
 * Default User Panel Control settings
 * All pages are enabled by default
 */
export const defaultUserPanelControls: UserPanelControls = {
  dashboard: true,
  tasks: true,
  myTasks: true,
  wallet: true,
  withdraw: true,
  referral: true,
  friendLeaderboard: true,
  rewards: true,
  rewardAds: true,
  leaderboard: true,
  contest: true,
  downloadApp: true,
  support: true,
  profile: true,
  quickLinks: true,
  login: true,
  signUp: true,
  blog: true,
  howItWorks: true,
  contact: true,
  legal: true,
  privacyPolicy: true,
  termsOfService: true,
  aboutUs: true,
};

/**
 * Default Platform Control settings
 */
export const defaultPlatformControls = {
  maintenanceMode: false,
  announcementEnabled: false,
  announcementMessage: '',
  tasksSystemEnabled: true,
  withdrawSystemEnabled: true,
};

/**
 * Page display names mapping for UI
 */
export const pageDisplayNames: { [key: string]: string } = {
  dashboard: 'Dashboard',
  tasks: 'Tasks',
  myTasks: 'My Tasks',
  wallet: 'Wallet',
  withdraw: 'Withdraw',
  referral: 'Referral',
  friendLeaderboard: 'Friend Leaderboard',
  rewards: 'Rewards',
  rewardAds: 'Reward Ads',
  leaderboard: 'Leaderboard',
  contest: 'Contest',
  downloadApp: 'Download App',
  support: 'Support',
  profile: 'Profile',
  quickLinks: 'Quick Links',
  login: 'Login',
  signUp: 'Sign Up',
  blog: 'Blog',
  howItWorks: 'How It Works',
  contact: 'Contact',
  legal: 'Legal',
  privacyPolicy: 'Privacy Policy',
  termsOfService: 'Terms of Service',
  aboutUs: 'About Us',
};

/**
 * Get User Panel Control settings
 * Returns the settings document or defaults if not found
 */
export async function getUserPanelControls() {
  try {
    const docRef = doc(db, SYSTEM_SETTINGS_COLLECTION, USER_PANEL_CONTROLS_DOC);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      // Merge with defaults to ensure all fields exist
      return { ...defaultUserPanelControls, ...docSnap.data() };
    }
    
    // Return defaults if document doesn't exist
    return defaultUserPanelControls;
  } catch (error) {
    console.error('Error getting user panel controls:', error);
    return defaultUserPanelControls;
  }
}

/**
 * Update User Panel Control settings
 * Only admin users can call this function
 */
export async function updateUserPanelControls(controls: Partial<UserPanelControls>) {
  try {
    const docRef = doc(db, SYSTEM_SETTINGS_COLLECTION, USER_PANEL_CONTROLS_DOC);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      await updateDoc(docRef, controls);
    } else {
      await setDoc(docRef, { ...defaultUserPanelControls, ...controls });
    }
    
    return true;
  } catch (error) {
    console.error('Error updating user panel controls:', error);
    throw error;
  }
}

/**
 * Get Platform Control settings
 * Returns the settings document or defaults if not found
 */
export async function getPlatformControls() {
  try {
    const docRef = doc(db, SYSTEM_SETTINGS_COLLECTION, PLATFORM_CONTROLS_DOC);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      // Merge with defaults to ensure all fields exist
      return { ...defaultPlatformControls, ...docSnap.data() };
    }
    
    // Return defaults if document doesn't exist
    return defaultPlatformControls;
  } catch (error) {
    console.error('Error getting platform controls:', error);
    return defaultPlatformControls;
  }
}

/**
 * Update Platform Control settings
 * Only admin users can call this function
 */
export async function updatePlatformControls(controls: Partial<PlatformControls>) {
  try {
    const docRef = doc(db, SYSTEM_SETTINGS_COLLECTION, PLATFORM_CONTROLS_DOC);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      await updateDoc(docRef, controls);
    } else {
      await setDoc(docRef, { ...defaultPlatformControls, ...controls });
    }
    
    return true;
  } catch (error) {
    console.error('Error updating platform controls:', error);
    throw error;
  }
}

/**
 * Subscribe to User Panel Control changes in real-time
 * Returns an unsubscribe function
 */
export function subscribeToUserPanelControls(callback: (controls: UserPanelControls) => void) {
  const docRef = doc(db, SYSTEM_SETTINGS_COLLECTION, USER_PANEL_CONTROLS_DOC);
  
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ ...defaultUserPanelControls, ...docSnap.data() });
    } else {
      callback(defaultUserPanelControls);
    }
  }, (error) => {
    console.error('Error subscribing to user panel controls:', error);
    callback(defaultUserPanelControls);
  });
}

/**
 * Subscribe to Platform Control changes in real-time
 * Returns an unsubscribe function
 */
export function subscribeToPlatformControls(callback: (controls: PlatformControls) => void) {
  const docRef = doc(db, SYSTEM_SETTINGS_COLLECTION, PLATFORM_CONTROLS_DOC);
  
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ ...defaultPlatformControls, ...docSnap.data() });
    } else {
      callback(defaultPlatformControls);
    }
  }, (error) => {
    console.error('Error subscribing to platform controls:', error);
    callback(defaultPlatformControls);
  });
}

/**
 * Check if a specific page is enabled
 * Helper function for components
 */
export function isPageEnabled(controls: UserPanelControls | null | undefined, pageKey: string): boolean {
  if (!controls || typeof controls[pageKey] === 'undefined') {
    return true; // Default to enabled if not specified
  }
  return controls[pageKey] === true;
}

/**
 * Initialize system settings documents with defaults
 * Should be called once during setup or when missing
 */
export async function initializeSystemSettings() {
  try {
    // Initialize user panel controls
    const userPanelRef = doc(db, SYSTEM_SETTINGS_COLLECTION, USER_PANEL_CONTROLS_DOC);
    const userPanelSnap = await getDoc(userPanelRef);
    
    if (!userPanelSnap.exists()) {
      await setDoc(userPanelRef, defaultUserPanelControls);
    }
    
    // Initialize platform controls
    const platformRef = doc(db, SYSTEM_SETTINGS_COLLECTION, PLATFORM_CONTROLS_DOC);
    const platformSnap = await getDoc(platformRef);
    
    if (!platformSnap.exists()) {
      await setDoc(platformRef, defaultPlatformControls);
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing system settings:', error);
    throw error;
  }
}
