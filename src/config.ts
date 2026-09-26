export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

const REQUIRED_KEYS = ['apiKey', 'projectId', 'appId'] as const;
const env = import.meta.env;

export const firebaseConfig: FirebaseWebConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: env.VITE_FIREBASE_APP_ID ?? '',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
};

/** Model per tier: the stronger model reads the resume once; the lighter one keeps interview turns fast. */
export const geminiModels = {
  quality: env.VITE_GEMINI_MODEL || 'gemini-3.8-flash',
  fast: env.VITE_GEMINI_FAST_MODEL || 'gemini-3.5-flash-lite',
} as const;
export const recaptchaSiteKey = env.VITE_RECAPTCHA_SITE_KEY ?? '';

/** Names of required Firebase settings that are still empty. */
export function missingFirebaseKeys(config: FirebaseWebConfig): string[] {
  return REQUIRED_KEYS.filter((key) => !config[key]);
}
