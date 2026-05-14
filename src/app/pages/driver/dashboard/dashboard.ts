import {Component, inject, signal, OnInit, OnDestroy} from '@angular/core';
import {RouterLink, Router} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule} from '@angular/common';
import {AuthService} from '../../../services/auth';
import {getDb, handleFirestoreError, OperationType} from '../../../firebase';
import {doc, onSnapshot, collection, query, where, Unsubscribe, updateDoc} from 'firebase/firestore';
import * as QRCode from 'qrcode';
import {DriverProfile, CommonRoute} from '../../../models/types';
import {User as FirebaseUser} from 'firebase/auth';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-driver-dashboard',
  imports: [RouterLink, MatIconModule, CommonModule, FormsModule],
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
          
          <!-- Common Routes Section -->
          <div class="mt-8 w-full">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-slate-900 flex items-center gap-2">
                <mat-icon class="text-primary">trending_up</mat-icon> Common Routes
              </h3>
              <button (click)="isManagingRoutes.set(!isManagingRoutes())" class="text-xs font-bold text-primary px-3 py-1 bg-primary/5 rounded-full transition-all">
                {{ isManagingRoutes() ? 'Done' : 'Manage' }}
              </button>
            </div>

            @if (isManagingRoutes()) {
              <div class="bg-primary/5 p-4 rounded-3xl border border-primary/10 mb-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <h4 class="text-xs font-black uppercase tracking-widest text-primary mb-4">Add New Route</h4>
                <div class="space-y-3">
                  <div class="grid grid-cols-2 gap-2">
                    <div class="space-y-1">
                      <label for="route-from" class="text-[9px] font-black uppercase text-slate-400 ml-1">From</label>
                      <input id="route-from" [(ngModel)]="newRoute.from" type="text" placeholder="Start Location" class="w-full bg-white border border-slate-100 p-2 rounded-xl text-xs outline-none focus:border-primary">
                    </div>
                    <div class="space-y-1">
                      <label for="route-to" class="text-[9px] font-black uppercase text-slate-400 ml-1">To</label>
                      <input id="route-to" [(ngModel)]="newRoute.to" type="text" placeholder="End Location" class="w-full bg-white border border-slate-100 p-2 rounded-xl text-xs outline-none focus:border-primary">
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <div class="space-y-1">
                      <label for="route-time" class="text-[9px] font-black uppercase text-slate-400 ml-1">Estimated Time</label>
                      <input id="route-time" [(ngModel)]="newRoute.estimatedTime" type="text" placeholder="e.g. 30 mins" class="w-full bg-white border border-slate-100 p-2 rounded-xl text-xs outline-none focus:border-primary">
                    </div>
                    <div class="space-y-1">
                      <label for="route-fare" class="text-[9px] font-black uppercase text-slate-400 ml-1">Price (₦)</label>
                      <input id="route-fare" [(ngModel)]="newRoute.baseFare" type="number" placeholder="Fare" class="w-full bg-white border border-slate-100 p-2 rounded-xl text-xs outline-none focus:border-primary">
                    </div>
                  </div>
                  <button (click)="addRoute()" [disabled]="!newRoute.from || !newRoute.to || !newRoute.baseFare" class="w-full bg-primary text-white py-2 rounded-xl font-bold text-xs disabled:opacity-50">
                    Add Route
                  </button>
                </div>
              </div>
            }

            <div class="space-y-3">
              @for (route of driverData()?.commonRoutes || []; track route.id) {
                <div class="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between group active:scale-95 transition-all relative">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm">
                      <mat-icon>route</mat-icon>
                    </div>
                    <div class="text-left">
                      <p class="text-xs font-bold text-slate-900">{{ route.from }} → {{ route.to }}</p>
                      <div class="flex items-center gap-2 mt-0.5">
                        <span class="text-[9px] text-slate-400 font-mono">{{ route.distance || 'Varies' }} • {{ route.estimatedTime }}</span>
                        @if (route.popularity) {
                          <span [class]="'text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter ' + 
                            (route.popularity === 'High' ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500')">
                            {{ route.popularity }} Demand
                          </span>
                        }
                      </div>
                    </div>
                  </div>
                  <div class="text-right flex items-center gap-4">
                    <div>
                      <p class="text-xs font-bold text-slate-900">₦{{ route.baseFare }}</p>
                      <p class="text-[8px] font-black uppercase tracking-widest text-slate-400">Fare</p>
                    </div>
                    @if (isManagingRoutes()) {
                      <button (click)="deleteRoute(route.id)" class="w-8 h-8 rounded-full bg-danger/10 text-danger flex items-center justify-center hover:bg-danger hover:text-white transition-all">
                        <mat-icon class="text-sm">delete</mat-icon>
                      </button>
                    }
                  </div>
                </div>
              } @empty {
                <div class="text-center py-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
                  <mat-icon class="text-slate-300 text-3xl mb-2">map</mat-icon>
                  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No routes defined</p>
                  <p class="text-[10px] text-slate-400 px-6 mt-1">Add routes you frequently travel to help passengers find you.</p>
                </div>
              }
            </div>
          </div>

          <!-- Status Badge -->
          <div [class]="'mt-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ' + 
            (driverData()?.verificationStatus === 'verified' ? 'bg-green-100 text-green-700' : 
             driverData()?.verificationStatus === 'pending' ? 'bg-amber-100 text-amber-700' : 
             driverData()?.verificationStatus === 'banned' ? 'bg-danger text-white' : 'bg-danger/10 text-danger')">
            {{ driverData()?.verificationStatus || 'Unregistered' }}
          </div>

          @if (driverData()?.verificationStatus === 'banned') {
            <div class="mt-6 p-6 bg-danger/10 rounded-3xl border border-danger/20 w-full">
              <div class="w-12 h-12 bg-danger text-white rounded-2xl flex items-center justify-center mx-auto mb-4">
                <mat-icon>warning</mat-icon>
              </div>
              <h3 class="text-danger font-bold text-lg mb-2">Account Restricted</h3>
              <p class="text-danger/80 text-xs leading-relaxed mb-4">
                Your account has been suspended by the administration. You cannot provide new rides at this time.
              </p>
              @if (driverData()?.banReason) {
                <div class="text-left bg-white/50 p-3 rounded-xl border border-danger/10">
                  <p class="text-[10px] font-black uppercase text-danger/40 mb-1">Reason for restriction</p>
                  <p class="text-xs font-bold text-danger">{{ driverData()?.banReason }}</p>
                </div>
              }
            </div>
          } @else if (driverData()?.verificationStatus !== 'verified') {
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

        <!-- Comprehensive Details -->
        <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-8">
          <h3 class="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-primary">info</mat-icon> Registration Details
          </h3>
          <div class="space-y-4">
            <div class="flex justify-between items-center text-sm py-2 border-b border-slate-50">
              <span class="text-slate-500">Member Since</span>
              <span class="font-bold text-slate-700">{{ driverData()?.createdAt | date:'mediumDate' }}</span>
            </div>
            @if (driverData()?.verifiedAt) {
              <div class="flex justify-between items-center text-sm py-2 border-b border-slate-50">
                <span class="text-slate-500">Verified On</span>
                <span class="font-bold text-green-600">{{ driverData()?.verifiedAt | date:'mediumDate' }}</span>
              </div>
            }
            <div class="flex justify-between items-center text-sm py-2 border-b border-slate-50">
              <span class="text-slate-500">License No.</span>
              <span class="font-mono font-bold text-slate-700">{{ driverData()?.licenseNumber }}</span>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-8">
          <h3 class="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-primary">directions_car</mat-icon> Vehicle Info
          </h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="p-3 bg-slate-50 rounded-2xl">
              <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Plate Number</p>
              <p class="font-mono font-bold text-slate-900">{{ driverData()?.plateNumber }}</p>
            </div>
            <div class="p-3 bg-slate-50 rounded-2xl">
              <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Vehicle Model</p>
              <p class="font-bold text-slate-900">{{ driverData()?.model }}</p>
            </div>
            <div class="p-3 bg-slate-50 rounded-2xl">
              <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Make</p>
              <p class="font-bold text-slate-900">{{ driverData()?.make }}</p>
            </div>
            <div class="p-3 bg-slate-50 rounded-2xl">
              <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Registration Year</p>
              <p class="font-bold text-slate-900">{{ driverData()?.year }}</p>
            </div>
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
  isManagingRoutes = signal(false);
  newRoute = { from: '', to: '', estimatedTime: '', baseFare: 0 };
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

  async addRoute() {
    const user = this.authService.user();
    const data = this.driverData();
    if (!user || !data) return;

    const routes = data.commonRoutes || [];
    const route: CommonRoute = {
      id: Math.random().toString(36).substring(2, 9),
      ...this.newRoute,
      distance: 'Calculating...',
      popularity: 'Medium'
    };

    try {
      await updateDoc(doc(getDb(), 'drivers', user.uid), {
        commonRoutes: [...routes, route]
      });
      this.newRoute = { from: '', to: '', estimatedTime: '', baseFare: 0 };
    } catch (error) {
      console.error('Failed to add route', error);
      alert('Failed to add route');
    }
  }

  async deleteRoute(routeId: string) {
    const user = this.authService.user();
    const data = this.driverData();
    if (!user || !data || !data.commonRoutes) return;

    const routes = data.commonRoutes.filter(r => r.id !== routeId);

    try {
      await updateDoc(doc(getDb(), 'drivers', user.uid), {
        commonRoutes: routes
      });
    } catch (error) {
      console.error('Failed to delete route', error);
      alert('Failed to delete route');
    }
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
