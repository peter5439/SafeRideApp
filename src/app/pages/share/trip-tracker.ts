import {Component, inject, signal, OnInit, OnDestroy, effect} from '@angular/core';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule} from '@angular/common';
import {getDb} from '../../firebase';
import {doc, getDoc, onSnapshot} from 'firebase/firestore';
import {DriverProfile, Trip} from '../../models/types';
import {AuthService} from '../../services/auth';

@Component({
// ... (omitting template for brevity, edit_file tool needs exact target content)
  selector: 'app-trip-tracker',
  standalone: true,
  imports: [MatIconModule, CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-slate-50 flex flex-col">
      <!-- Header -->
      <header class="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-100 sticky top-0 z-10">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <mat-icon class="text-white text-sm">share</mat-icon>
          </div>
          <h1 class="font-bold text-lg">Trip Tracker</h1>
        </div>
        <div class="flex items-center gap-2 text-accent font-bold text-xs uppercase tracking-widest">
          @if (trip()?.status === 'active') {
            <span class="w-2 h-2 bg-accent rounded-full animate-ping"></span>
            Live Tracking
          } @else {
            <mat-icon class="text-xs">event_available</mat-icon>
            History
          }
        </div>
      </header>

      @if (loading() || authService.loading()) {
        <div class="flex-1 flex items-center justify-center">
          <div class="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
      } @else if (!authService.user()) {
        <main class="flex-1 p-6 flex flex-col items-center justify-center text-center max-w-md mx-auto">
          <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-6">
            <mat-icon class="text-5xl">lock</mat-icon>
          </div>
          <h2 class="text-xl font-bold text-slate-900 mb-2">Secure Link</h2>
          <p class="text-slate-500 mb-8 px-4">To ensure the safety of our passengers, please sign in to track this trip.</p>
          <button (click)="authService.loginWithGoogle()" class="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-3">
             <mat-icon>login</mat-icon> Sign In with Google
          </button>
        </main>
      } @else if (trip()) {
        <main class="flex-1 p-6 max-w-md mx-auto w-full">
          <!-- Status Banner -->
          <div [class]="'mb-6 p-4 rounded-2xl flex items-center gap-3 ' + (trip()?.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-700 border border-slate-200')">
            <mat-icon>{{ trip()?.status === 'active' ? 'directions_car' : 'check_circle' }}</mat-icon>
            <div>
              <p class="text-sm font-bold">{{ trip()?.status === 'active' ? 'Ride in progress' : 'Ride completed' }}</p>
              <p class="text-[10px] font-bold uppercase opacity-70">{{ trip()?.timestamp | date:'medium' }}</p>
            </div>
          </div>

          <!-- Driver Info Card -->
          <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
            <div class="flex items-center gap-4 mb-6">
              <img [src]="driver()?.profilePhotoUrl || 'https://picsum.photos/seed/driver/200/200'" 
                   class="w-16 h-16 rounded-2xl object-cover border-2 border-slate-50" 
                   referrerpolicy="no-referrer" [alt]="driver()?.displayName">
              <div>
                <h2 class="text-lg font-bold text-slate-900">{{ driver()?.displayName }}</h2>
                <p class="text-slate-500 text-sm">{{ driver()?.make }} {{ driver()?.model }} • {{ driver()?.plateNumber }}</p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4 py-4 border-t border-slate-50">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                  <mat-icon class="text-sm">verified_user</mat-icon>
                </div>
                <div>
                  <p class="text-[10px] font-bold text-slate-400 uppercase">Driver</p>
                  <p class="text-xs font-bold text-slate-700">Verified</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                  <mat-icon class="text-sm">star</mat-icon>
                </div>
                <div>
                  <p class="text-[10px] font-bold text-slate-400 uppercase">Rating</p>
                  <p class="text-xs font-bold text-slate-700">{{ (driver()?.rating || 0).toFixed(1) }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Passenger Info -->
          <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 font-bold">
                {{ trip()?.passengerName?.charAt(0) || 'P' }}
              </div>
              <div>
                <p class="text-sm font-bold text-slate-900">{{ trip()?.passengerName || 'A Passenger' }}</p>
                <p class="text-[10px] text-slate-400 font-bold uppercase">On board</p>
              </div>
            </div>
            <div class="text-right">
                <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Location</p>
                <p class="text-xs font-bold text-slate-600">
                    {{ trip()?.currentLocation ? (trip()?.currentLocation?.latitude?.toFixed(4) + ', ' + trip()?.currentLocation?.longitude?.toFixed(4)) : 'Acquiring...' }}
                </p>
            </div>
          </div>

          <!-- Map Component (Simulator) -->
          <div class="bg-slate-200 rounded-3xl aspect-square mb-8 flex items-center justify-center relative overflow-hidden border border-slate-200 shadow-inner group">
            <!-- Simulated Map Layer -->
            <img [src]="'https://picsum.photos/seed/' + (trip()?.currentLocation?.latitude || 'lagos') + '/600/600?blur=1'" 
                 class="absolute inset-0 w-full h-full object-cover opacity-60 transition-opacity duration-1000" 
                 referrerpolicy="no-referrer" alt="Trip Map">
            
            <div class="relative z-10 flex flex-col items-center">
              <div class="w-16 h-16 bg-white rounded-full shadow-2xl flex items-center justify-center text-accent mb-4 border-4 border-accent/20 animate-bounce">
                <mat-icon class="text-3xl">navigation</mat-icon>
              </div>
              <p class="text-xs font-bold text-slate-600 bg-white/80 backdrop-blur px-6 py-3 rounded-full shadow-lg border border-slate-100">
                {{ trip()?.status === 'active' ? 'Moving through LagosRide route' : 'Arrived at destination' }}
              </p>
            </div>

            <!-- Coordinate Overlay -->
            <div class="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur text-white p-3 rounded-xl text-[10px] font-mono border border-white/10">
                <div class="flex items-center gap-2">
                    <span class="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                    LAT: {{ trip()?.currentLocation?.latitude || '...' }}
                </div>
                <div class="flex items-center gap-2 mt-1">
                    <span class="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                    LNG: {{ trip()?.currentLocation?.longitude || '...' }}
                </div>
            </div>
          </div>

          <div class="text-center">
            <p class="text-slate-400 text-[10px] font-bold uppercase tracking-widest">A LagosRide Safety Feature</p>
          </div>
        </main>
      } @else {
        <div class="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <mat-icon class="text-6xl text-slate-200 mb-4">location_off</mat-icon>
          <h2 class="text-xl font-bold text-slate-900 mb-2">Trip link expired</h2>
          <p class="text-slate-500 mb-6">This trip tracking link is no longer active or is invalid.</p>
          <a routerLink="/" class="bg-primary text-white px-8 py-3 rounded-xl font-bold">LagosRide Home</a>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class TripTracker implements OnInit, OnDestroy {
  route = inject(ActivatedRoute);
  authService = inject(AuthService);
  
  tripId = signal<string | null>(null);
  trip = signal<Trip | null>(null);
  driver = signal<DriverProfile | null>(null);
  loading = signal(true);
  private unsubscribe: (() => void) | null = null;

  constructor() {
    effect(() => {
      const user = this.authService.user();
      const id = this.tripId();
      if (user && id && !this.trip()) {
        this.setupRealtimeUpdates(id);
      }
    });
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('tripId');
    this.tripId.set(id);
    
    if (this.authService.user() && id) {
      await this.setupRealtimeUpdates(id);
    } else {
      this.loading.set(false);
    }
  }

  ngOnDestroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  async setupRealtimeUpdates(tripId: string) {
    this.loading.set(true);
    
    this.unsubscribe = onSnapshot(doc(getDb(), 'trips', tripId), async (docSnap) => {
      if (docSnap.exists()) {
        const tripData = { id: docSnap.id, ...docSnap.data() } as Trip;
        this.trip.set(tripData);
        
        if (!this.driver()) {
          const driverSnap = await getDoc(doc(getDb(), 'drivers', tripData.driverId));
          if (driverSnap.exists()) {
            this.driver.set(driverSnap.data() as DriverProfile);
          }
        }
      }
      this.loading.set(false);
    }, (error) => {
      console.error('Error tracking shared trip', error);
      this.loading.set(false);
    });
  }
}
