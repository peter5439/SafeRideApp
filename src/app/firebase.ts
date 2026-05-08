import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const auth = getAuthService();
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Gracefully handle permission errors during logout or when auth is missing/initializing
  const isPermissionDenied = errorMessage.includes('permission-denied') || errorMessage.includes('Missing or insufficient permissions');
  
  if (isPermissionDenied && !auth.currentUser) {
    console.warn(`Firestore permission denied for path "${path}" while user is logged out or initializing. This is expected during transitions.`);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }
  
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'TODO_KEYHERE' || firebaseConfig.apiKey === '') {
    console.error('Firebase API Key is missing or invalid. Please check your firebase-applet-config.json file.');
    // Return a dummy app or throw a more descriptive error
    // In SSR, we might want to avoid crashing the whole server
    throw new Error('Firebase Configuration Error: Invalid or missing API Key.');
  }
  
  return initializeApp(firebaseConfig);
}

let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

export const getDb = (): Firestore => {
  if (!dbInstance) {
    dbInstance = getFirestore(getFirebaseApp(), firebaseConfig.firestoreDatabaseId || '(default)');
  }
  return dbInstance;
};

export const getAuthService = (): Auth => {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
  }
  return authInstance;
};
