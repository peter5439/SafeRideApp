import {Component, inject, signal, OnInit, OnDestroy} from '@angular/core';
import {RouterLink, Router} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule} from '@angular/common';
import {AuthService} from '../../../services/auth';
import {getDb, handleFirestoreError, OperationType} from '../../../firebase';
import {doc, onSnapshot, collection, query, where, Unsubscribe} from 'firebase/firestore';
import * as QRCode from 'qrcode';
import {DriverProfile} from '../../../models/types';
import {User as FirebaseUser} from 'firebase/auth';

@Component({
  selector: 'app-driver-dashboard',
  imports: [RouterLink, MatIconModule, CommonModule],
  template: `
    <div class="min-h-screen bg-slate-50 flex flex-col">
      <!-- Header -->
      <header class="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div class="flex items-center gap-2">
          <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
            <mat-icon class="text-white">verified_user</mat-icon>
          </div>
          <span class="font-display font-bold text-xl tracking-tight">SafeRide Driver</span>
        </div>
        <button (click)="authService.logout()" class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors">
          <mat-icon>logout</mat-icon>
        </button>
      </header>

      <main class="flex-1 p-6 max-w-md mx-auto w-full">
        <!-- Driver Status Card -->
        <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-8 flex flex-col items-center text-center">
          <div class="relative mb-4">
            <img [src]="driverData()?.profilePhotoUrl || 'https://picsum.photos/seed/driver/200/200'" 
                 class="w-24 h-24 rounded-full object-cover border-4 border-primary/10" 
                 referrerpolicy="no-referrer" alt="Driver Profile">
            @if (driverData()?.verificationStatus === 'verified') {
              <div class="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1 border-2 border-white shadow-sm">
                <mat-icon class="text-sm">verified</mat-icon>
              </div>
            }
          </div>
          <h2 class="text-xl font-bold text-slate-900">{{ driverData()?.displayName || 'Driver Name' }}</h2>
          
          <!-- Status Badge -->
          <div [class]="'mt-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ' + 
            (driverData()?.verificationStatus === 'verified' ? 'bg-green-100 text-green-700' : 
             driverData()?.verificationStatus === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-danger/10 text-danger')">
            {{ driverData()?.verificationStatus || 'Unregistered' }}
          </div>

          @if (driverData()?.verificationStatus !== 'verified') {
            <div class="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 w-full">
              <p class="text-xs text-slate-500 leading-relaxed">
                Your account is currently <strong>{{ driverData()?.verificationStatus || 'unregistered' }}</strong>. 
                Please complete your registration to start providing rides.
              </p>
              @if (!driverData()) {
                <a routerLink="/driver/register" class="mt-4 inline-block bg-primary text-white px-6 py-2 rounded-xl font-bold text-sm">Register Now</a>
              }
            </div>
          }
        </div>

        <!-- QR Code Section (Only if verified) -->
        @if (driverData()?.verificationStatus === 'verified') {
          <div class="bg-white rounded-3xl p-8 shadow-xl shadow-primary/5 border border-slate-100 mb-8 flex flex-col items-center text-center">
            <h3 class="font-bold text-slate-900 mb-6">Your Driver QR Code</h3>
            
            <div class="bg-slate-50 p-4 rounded-3xl mb-6 border-2 border-primary/20">
              <img [src]="qrCodeUrl()" class="w-48 h-48" alt="Driver QR Code">
            </div>

            <p class="text-slate-500 text-sm mb-6">Passengers must scan this code to verify your identity and start a safe trip.</p>
            
            <div class="flex flex-col w-full gap-3">
              <button (click)="downloadQR()" class="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:bg-primary-dark transition-all">
                <mat-icon class="text-sm">download</mat-icon> Download QR
              </button>
              
              <button (click)="generateQR()" class="text-slate-400 font-bold text-sm flex items-center justify-center gap-2 hover:text-primary transition-colors">
                <mat-icon class="text-sm">refresh</mat-icon> Regenerate Code
              </button>
            </div>
          </div>
        }

        <!-- Quick Stats -->
        <div class="grid grid-cols-2 gap-4 mb-8">
          <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Scans</span>
            <p class="text-2xl font-bold text-slate-900">{{ scanCount() }}</p>
          </div>
          <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Rating</span>
            <p class="text-2xl font-bold text-slate-900 flex items-center gap-1">
              {{ (driverData()?.rating || 0).toFixed(1) }} 
              <mat-icon class="text-amber-400 text-sm">star</mat-icon>
            </p>
          </div>
        </div>

        <!-- Navigation Links -->
        <div class="space-y-3 mb-8">
          <a routerLink="/driver/profile" class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:bg-slate-50 transition-colors">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                <mat-icon>person</mat-icon>
              </div>
              <span class="font-bold text-slate-700">Edit Profile</span>
            </div>
            <mat-icon class="text-slate-300 group-hover:text-primary transition-colors">chevron_right</mat-icon>
          </a>
          <a routerLink="/driver/history" class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:bg-slate-50 transition-colors">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                <mat-icon>history</mat-icon>
              </div>
              <span class="font-bold text-slate-700">Scan History</span>
            </div>
            <mat-icon class="text-slate-300 group-hover:text-primary transition-colors">chevron_right</mat-icon>
          </a>
          <a routerLink="/driver/lost-items" class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:bg-slate-50 transition-colors">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                <mat-icon>inventory_2</mat-icon>
              </div>
              <span class="font-bold text-slate-700">Lost Items</span>
            </div>
            <mat-icon class="text-slate-300 group-hover:text-primary transition-colors">chevron_right</mat-icon>
          </a>
        </div>
      </main>

      <!-- Bottom Nav -->
      <nav class="bg-white border-t border-slate-100 px-6 py-3 flex justify-around items-center sticky bottom-0">
        <a routerLink="/driver/dashboard" class="flex flex-col items-center text-primary">
          <mat-icon>dashboard</mat-icon>
          <span class="text-[10px] font-bold uppercase tracking-wider mt-1">Dashboard</span>
        </a>
        <a routerLink="/driver/qr" class="flex flex-col items-center text-slate-400">
          <mat-icon>qr_code</mat-icon>
          <span class="text-[10px] font-bold uppercase tracking-wider mt-1">QR Code</span>
        </a>
        <a routerLink="/driver/profile" class="flex flex-col items-center text-slate-400">
          <mat-icon>person</mat-icon>
          <span class="text-[10px] font-bold uppercase tracking-wider mt-1">Profile</span>
        </a>
      </nav>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class DriverDashboard implements OnInit, OnDestroy {
  authService = inject(AuthService);
  router = inject(Router);
  driverData = signal<DriverProfile | null>(null);
  qrCodeUrl = signal<string>('');
  scanCount = signal<number>(0);
  private driverSub: Unsubscribe | null = null;
  private scansSub: Unsubscribe | null = null;

  ngOnInit() {
    const user = this.authService.user() as FirebaseUser | null;
    if (user) {
      this.setupSubscriptions(user.uid);
    }
  }

  ngOnDestroy() {
    this.cleanupSubscriptions();
  }

  private setupSubscriptions(uid: string) {
    this.cleanupSubscriptions();
    
    // Subscribe to driver profile
    const driverPath = `drivers/${uid}`;
    this.driverSub = onSnapshot(doc(getDb(), 'drivers', uid), (docSnap) => {
      if (docSnap.exists()) {
        this.driverData.set(docSnap.data() as DriverProfile);
        this.generateQR();
      } else {
        this.router.navigate(['/driver/register']);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, driverPath);
    });

    // Subscribe to scan count
    const tripsPath = 'trips';
    const q = query(collection(getDb(), tripsPath), where('driverId', '==', uid));
    this.scansSub = onSnapshot(q, (snapshot) => {
      this.scanCount.set(snapshot.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, tripsPath);
    });
  }

  private cleanupSubscriptions() {
    if (this.driverSub) this.driverSub();
    if (this.scansSub) this.scansSub();
  }

  async generateQR() {
    const user = this.authService.user() as FirebaseUser | null;
    if (user) {
      try {
        // The QR code contains the full URL to the driver details page
        const urlContent = `${window.location.origin}/passenger/driver-details/${user.uid}`;
        const url = await QRCode.toDataURL(urlContent, {
          width: 400,
          margin: 2,
          color: {
            dark: '#1FAF5A',
            light: '#F8FAFC'
          }
        });
        this.qrCodeUrl.set(url);
      } catch (err) {
        console.error('QR generation failed', err);
      }
    }
  }

  downloadQR() {
    const url = this.qrCodeUrl();
    if (!url) return;

    const link = document.createElement('a');
    link.href = url;
    link.download = `SafeRide-QR-${this.driverData()?.displayName || 'Driver'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
