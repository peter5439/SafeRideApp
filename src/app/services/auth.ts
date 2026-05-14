import {Injectable, signal, inject} from '@angular/core';
import {Router} from '@angular/router';
import {getAuthService, getDb} from '../firebase';
import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import {doc, getDoc, setDoc} from 'firebase/firestore';
import {UserProfile} from '../models/types';
import {handleFirestoreError, OperationType} from '../firebase';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private router = inject(Router);
  user = signal<FirebaseUser | null>(null);
  profile = signal<UserProfile | null>(null);
  loading = signal<boolean>(true);
  redirectUrl: string | null = null;

  constructor() {
    console.log('AuthService initializing...');
    try {
      onAuthStateChanged(getAuthService(), async (user: FirebaseUser | null) => {
        console.log('Auth state changed:', user?.uid || 'no user');
        this.user.set(user);
        try {
          if (user) {
            await this.fetchProfile(user.uid);
          } else {
            this.profile.set(null);
          }
        } catch (err) {
          console.error('Error fetching profile during auth change:', err);
        } finally {
          this.loading.set(false);
        }
      });
    } catch (err) {
      console.error('Failed to initialize Firebase Auth:', err);
      this.loading.set(false);
    }
  }

  private isLoggingIn = false;

  async loginWithGoogle(role?: 'passenger' | 'driver' | 'admin') {
    if (this.isLoggingIn) return null;
    this.isLoggingIn = true;
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(getAuthService(), provider);
      await this.ensureProfile(result.user, role);
      await this.fetchProfile(result.user.uid);
      return this.profile();
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err.code === 'auth/cancelled-popup-request') {
        console.warn('Login popup was cancelled or another one was opened.');
        return null;
      }
      if (err.code === 'auth/popup-closed-by-user') {
        console.warn('Login popup closed by user.');
        return null;
      }
      console.error('Login failed', error);
      throw error;
    } finally {
      this.isLoggingIn = false;
    }
  }

  private getCollectionForRole(role: string): string {
    switch (role) {
      case 'admin': return 'admins';
      case 'driver': return 'drivers';
      case 'passenger': return 'passengers';
      default: return 'passengers';
    }
  }

  async registerWithEmail(email: string, pass: string, name: string, role: 'passenger' | 'driver' | 'admin') {
    try {
      const result = await createUserWithEmailAndPassword(getAuthService(), email, pass);
      await updateProfile(result.user, { displayName: name });
      
      const newProfile: Record<string, unknown> = {
        uid: result.user.uid,
        email: email,
        displayName: name,
        role: role,
        createdAt: new Date().toISOString()
      };

      if (role === 'driver') {
        newProfile['verificationStatus'] = 'pending';
      }
      
      const collectionName = this.getCollectionForRole(role);
      try {
        await setDoc(doc(getDb(), collectionName, result.user.uid), newProfile);
      } catch (firestoreErr) {
        handleFirestoreError(firestoreErr, OperationType.WRITE, `${collectionName}/${result.user.uid}`);
        throw new Error('Profile creation failed. Please contact support.');
      }
      
      this.profile.set(newProfile as unknown as UserProfile);
      return newProfile as unknown as UserProfile;
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('authInfo')) {
        throw error;
      }
      console.error('Registration failed', error);
      const err = error as { code?: string, message?: string };
      
      if (err.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered. Please login instead.');
      }
      if (err.code === 'auth/weak-password') {
        throw new Error('Password should be at least 6 characters.');
      }
      if (err.code === 'auth/invalid-email') {
        throw new Error('Invalid email address.');
      }
      if (err.code === 'auth/network-request-failed') {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      
      throw new Error(err.message || 'Registration failed');
    }
  }

  async loginWithEmail(email: string, pass: string) {
    try {
      const result = await signInWithEmailAndPassword(getAuthService(), email, pass);
      await this.fetchProfile(result.user.uid);
      return this.profile();
    } catch (error) {
      console.error('Email login failed', error);
      const err = error as { code?: string, message?: string };
      if (err.code === 'auth/network-request-failed') {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        throw new Error('Invalid email or password.');
      }
      throw new Error(err.message || 'Login failed');
    }
  }

  async loginAndNavigate(targetRole: 'passenger' | 'driver' | 'admin') {
    this.loading.set(true);
    try {
      const currentUser = this.user();
      let profile = this.profile();

      if (!currentUser) {
        profile = await this.loginWithGoogle(targetRole);
      } else if (!profile) {
        // User is logged in to Auth but has no Firestore profile
        profile = await this.ensureProfile(currentUser, targetRole);
      }

      if (profile) {
        await this.navigateAfterLogin(profile, targetRole);
      }
    } catch (error) {
      console.error('Login and navigate failed', error);
    } finally {
      this.loading.set(false);
    }
  }

  async navigateAfterLogin(profile: UserProfile | null, targetRole?: 'passenger' | 'driver' | 'admin') {
    if (!profile) {
      console.warn('Cannot navigate: No user profile found.');
      alert('Your account profile could not be found. Please contact support or try logging in again.');
      return;
    }

    if (this.redirectUrl) {
      const url = this.redirectUrl;
      this.redirectUrl = null;
      await this.router.navigateByUrl(url);
      return;
    }

    const isAdmin = profile.role === 'admin' || profile.email.toLowerCase().includes('chidolueebuka');
    
    // Admins can go anywhere
    if (isAdmin) {
      if (targetRole === 'admin') await this.router.navigate(['/admin/dashboard']);
      else if (targetRole === 'driver') await this.router.navigate(['/driver/dashboard']);
      else await this.router.navigate(['/passenger/home']);
      return;
    }

    // For others, check if they are entering their authorized portal
    if (profile.role === targetRole || !targetRole) {
      if (profile.role === 'admin') await this.router.navigate(['/admin/dashboard']);
      else if (profile.role === 'driver') await this.router.navigate(['/driver/dashboard']);
      else await this.router.navigate(['/passenger/home']);
    } else {
      // Role mismatch
      alert(`Access Denied. You are registered as a ${profile.role}. Redirecting to your dashboard.`);
      if (profile.role === 'driver') await this.router.navigate(['/driver/dashboard']);
      else await this.router.navigate(['/passenger/home']);
    }
  }

  async logout() {
    await signOut(getAuthService());
    await this.router.navigate(['/']);
  }

  async checkAuth() {
    const user = this.user();
    if (user) {
      await this.fetchProfile(user.uid);
    }
    return this.profile();
  }

  isAdmin() {
    const p = this.profile();
    return p?.role === 'admin' || p?.email.toLowerCase().includes('chidolueebuka');
  }

  private async fetchProfile(uid: string) {
    console.log('Fetching profile for:', uid);
    try {
      // Check all three collections
      const collections = ['admins', 'drivers', 'passengers'];
      for (const col of collections) {
        const docRef = doc(getDb(), col, uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          // Force admin role if email matches pattern
          if (data.email.toLowerCase().includes('chidolueebuka') && col !== 'admins') {
            data.role = 'admin';
            await setDoc(doc(getDb(), 'admins', uid), data);
            this.profile.set(data);
            return;
          }
          this.profile.set(data);
          return;
        }
      }

      // If we reach here, profile is missing. 
      // check if it's one of our bulk-registered users to auto-heal
      const user = this.user();
      if (user && user.email) {
        const email = user.email.toLowerCase();
        if (email.startsWith('driver.') || email.includes('p.walker1') || email.includes('m.smith2')) {
          console.log('Auto-healing missing profile for bulk user:', email);
          const role = (email.startsWith('driver.') ? 'driver' : 'passenger') as 'driver' | 'passenger';
          const profile = await this.ensureProfile(user, role);
          this.profile.set(profile);
          return;
        }
      }

      this.profile.set(null);
    } catch (err) {
      console.error('fetchProfile failed:', err);
      throw err;
    }
  }

  private async ensureProfile(user: FirebaseUser, requestedRole?: 'passenger' | 'driver' | 'admin') {
    // Check if profile exists in any collection
    const collections = ['admins', 'drivers', 'passengers'];
    let existingProfile = null;

    for (const col of collections) {
      const docSnap = await getDoc(doc(getDb(), col, user.uid));
      if (docSnap.exists()) {
        existingProfile = docSnap.data() as UserProfile;
        break;
      }
    }
    
    if (!existingProfile) {
      const isAdmin = user.email?.toLowerCase().includes('chidolueebuka');
      const role = isAdmin ? 'admin' : (requestedRole || 'passenger');
      const collectionName = this.getCollectionForRole(role);
      
      const newProfile: Record<string, unknown> = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        role: role,
        createdAt: new Date().toISOString()
      };

      if (role === 'driver') {
        newProfile['verificationStatus'] = 'pending';
        newProfile['rating'] = 5.0;
        newProfile['totalRatings'] = 0;
      }

      await setDoc(doc(getDb(), collectionName, user.uid), newProfile);
      const profile = newProfile as unknown as UserProfile;
      this.profile.set(profile);
      return profile;
    } else {
      // If profile exists but role is wrong for the admin email, fix it
      if (user.email?.toLowerCase().includes('chidolueebuka') && existingProfile.role !== 'admin') {
        existingProfile.role = 'admin';
        await setDoc(doc(getDb(), 'admins', user.uid), existingProfile);
        this.profile.set(existingProfile);
      }
      return existingProfile;
    }
  }
}
