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

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'passenger' | 'driver';
  createdAt: string;
}

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

  async loginWithGoogle() {
    if (this.isLoggingIn) return null;
    this.isLoggingIn = true;
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(getAuthService(), provider);
      await this.ensureProfile(result.user);
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
        console.error('Firestore profile creation failed:', firestoreErr);
        // If profile creation fails, we should probably delete the auth user or at least inform the user
        throw new Error('Profile creation failed. Please contact support.');
      }
      
      this.profile.set(newProfile as unknown as UserProfile);
      return newProfile as unknown as UserProfile;
    } catch (error: unknown) {
      console.error('Registration failed', error);
      const err = error as { code?: string };
      if (err.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered. Please login instead.');
      }
      if (err.code === 'auth/weak-password') {
        throw new Error('Password should be at least 6 characters.');
      }
      if (err.code === 'auth/invalid-email') {
        throw new Error('Invalid email address.');
      }
      throw error;
    }
  }

  async loginWithEmail(email: string, pass: string) {
    try {
      const result = await signInWithEmailAndPassword(getAuthService(), email, pass);
      await this.fetchProfile(result.user.uid);
      return this.profile();
    } catch (error) {
      console.error('Email login failed', error);
      throw error;
    }
  }

  async loginAndNavigate(targetRole: 'passenger' | 'driver' | 'admin') {
    this.loading.set(true);
    try {
      const currentUser = this.user();
      let profile = this.profile();

      if (!currentUser) {
        profile = await this.loginWithGoogle();
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

  async navigateAfterLogin(profile: UserProfile, targetRole?: 'passenger' | 'driver' | 'admin') {
    if (this.redirectUrl) {
      const url = this.redirectUrl;
      this.redirectUrl = null;
      await this.router.navigateByUrl(url);
      return;
    }

    const isAdmin = profile.role === 'admin' || profile.email === 'chidolueebuka0@gmail.com';
    
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

  isAdmin() {
    const p = this.profile();
    return p?.role === 'admin' || p?.email === 'chidolueebuka0@gmail.com';
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
          // Force admin role if email matches
          if (data.email === 'chidolueebuka0@gmail.com' && col !== 'admins') {
            // Move to admins collection if needed
            data.role = 'admin';
            await setDoc(doc(getDb(), 'admins', uid), data);
            // Optional: delete from old collection
            this.profile.set(data);
            return;
          }
          this.profile.set(data);
          return;
        }
      }
      this.profile.set(null);
    } catch (err) {
      console.error('fetchProfile failed:', err);
      throw err;
    }
  }

  private async ensureProfile(user: FirebaseUser) {
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
      const isAdmin = user.email === 'chidolueebuka0@gmail.com';
      const role = isAdmin ? 'admin' : 'passenger';
      const collectionName = this.getCollectionForRole(role);
      
      const newProfile: Record<string, unknown> = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        role: role,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(getDb(), collectionName, user.uid), newProfile);
      this.profile.set(newProfile as unknown as UserProfile);
    } else {
      // If profile exists but role is wrong for the admin email, fix it
      if (user.email === 'chidolueebuka0@gmail.com' && existingProfile.role !== 'admin') {
        existingProfile.role = 'admin';
        await setDoc(doc(getDb(), 'admins', user.uid), existingProfile);
        this.profile.set(existingProfile);
      }
    }
  }
}
