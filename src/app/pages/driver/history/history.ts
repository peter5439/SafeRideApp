import {Component, signal, inject, effect} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule} from '@angular/common';
import {getDb, handleFirestoreError, OperationType} from '../../../firebase';
import {collection, query, where, onSnapshot, orderBy, getDoc, doc, Unsubscribe, setDoc} from 'firebase/firestore';
import {Trip, LostItem} from '../../../models/types';
import {AuthService} from '../../../services/auth';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-driver-history',
  imports: [RouterLink, MatIconModule, CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-50 flex flex-col">
      <!-- Header -->
      <header class="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-100 sticky top-0 z-10">
        <a routerLink="/driver/dashboard" class="text-slate-600">
          <mat-icon>arrow_back</mat-icon>
        </a>
        <h1 class="font-bold text-lg">Scan History</h1>
        <button (click)="authService.logout()" class="text-slate-400 hover:text-danger transition-colors">
          <mat-icon>logout</mat-icon>
        </button>
      </header>

      <main class="flex-1 p-6 max-w-md mx-auto w-full">
        @if (authService.loading()) {
          <div class="flex flex-col items-center justify-center py-20">
            <div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Loading History</p>
          </div>
        } @else if (!authService.user()) {
          <div class="text-center py-20">
            <mat-icon class="text-6xl text-slate-200 mb-4">lock</mat-icon>
            <h2 class="text-xl font-bold mb-2">Login Required</h2>
            <button (click)="authService.loginWithGoogle()" class="bg-primary text-white px-6 py-2 rounded-xl font-bold mt-4">
              Sign In
            </button>
          </div>
        } @else {
          <div class="space-y-4">
            @for (trip of trips(); track trip.id) {
              <div class="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                <div class="flex items-center gap-4">
                  <div class="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <mat-icon>person</mat-icon>
                  </div>
                  <div>
                    <h3 class="font-bold text-slate-900">{{ trip.passengerName || 'Passenger' }}</h3>
                    <p class="text-xs text-slate-500">{{ trip.timestamp | date:'medium' }}</p>
                  </div>
                </div>
                <div class="flex flex-col items-end gap-2">
                   <span class="text-[10px] font-black uppercase px-2 py-1 bg-green-100 text-green-700 rounded-md">Scanned</span>
                   <button (click)="openFoundItemModal(trip)" class="text-[10px] font-bold text-slate-400 hover:text-primary transition-colors flex items-center gap-1">
                     <mat-icon class="text-xs">inventory_2</mat-icon> Found Item?
                   </button>
                </div>
              </div>
            } @empty {
              <div class="text-center py-20">
                <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                  <mat-icon class="text-5xl">history</mat-icon>
                </div>
                <h2 class="text-xl font-bold text-slate-900 mb-2">No Scans Yet</h2>
                <p class="text-slate-500 text-sm">When passengers scan your QR code, the records will appear here.</p>
              </div>
            }
          </div>
        }
      </main>

      <!-- Found Item Modal -->
      @if (showFoundItemModal()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div class="bg-white w-full max-w-sm rounded-[32px] p-8 animate-scale-in">
            <div class="flex flex-col items-center text-center">
              <div class="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-600 mb-6">
                <mat-icon class="text-4xl">inventory_2</mat-icon>
              </div>
              <h2 class="text-2xl font-bold text-slate-900 mb-2">Report Found Item</h2>
              <p class="text-slate-500 text-sm mb-8">Did you find something left by {{ selectedTrip()?.passengerName }}?</p>
              
              <textarea 
                [(ngModel)]="foundItemDescription"
                placeholder="Describe the item you found..."
                class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm mb-8 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[120px]"
              ></textarea>

              <div class="flex flex-col w-full gap-3">
                <button 
                  (click)="submitFoundItemReport()" 
                  [disabled]="!foundItemDescription.trim() || foundItemLoading()"
                  class="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  @if (foundItemLoading()) {
                    <div class="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  } @else {
                    Submit Report
                  }
                </button>
                <button (click)="showFoundItemModal.set(false)" class="text-slate-400 font-bold text-sm py-2">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Bottom Nav -->
      <nav class="bg-white border-t border-slate-100 px-6 py-3 flex justify-around items-center sticky bottom-0">
        <a routerLink="/driver/dashboard" class="flex flex-col items-center text-slate-400">
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
    @keyframes scale-in {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .animate-scale-in {
      animation: scale-in 0.2s ease-out;
    }
  `]
})
export class DriverHistory {
  authService = inject(AuthService);
  trips = signal<(Trip & { passengerName?: string })[]>([]);
  private unsubscribe: Unsubscribe | null = null;

  // Found Item signals
  showFoundItemModal = signal(false);
  selectedTrip = signal<Trip | null>(null);
  foundItemDescription = '';
  foundItemLoading = signal(false);

  constructor() {
    effect(() => {
      const user = this.authService.user();
      if (user) {
        this.setupSubscription(user.uid);
      } else {
        this.trips.set([]);
        this.cleanupSubscription();
      }
    });
  }

  private setupSubscription(uid: string) {
    this.cleanupSubscription();
    const path = 'trips';
    const q = query(
      collection(getDb(), path), 
      where('driverId', '==', uid),
      orderBy('timestamp', 'desc')
    );
    
    this.unsubscribe = onSnapshot(q, async (snapshot) => {
      const tripData = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Trip));
      
      // Fetch passenger names for each trip if not already present
      const tripsWithNames = await Promise.all(tripData.map(async (trip: Trip) => {
        if (trip.passengerName) {
          return trip;
        }
        
        try {
          // Fallback for older trips: fetch from passengers collection
          const passengerDoc = await getDoc(doc(getDb(), 'passengers', trip.passengerId));
          return {
            ...trip,
            passengerName: passengerDoc.exists() ? (passengerDoc.data() as { displayName: string })['displayName'] : 'SafeRide Passenger'
          };
        } catch {
          return { ...trip, passengerName: 'SafeRide Passenger' };
        }
      }));
      
      this.trips.set(tripsWithNames);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  }

  openFoundItemModal(trip: Trip) {
    this.selectedTrip.set(trip);
    this.foundItemDescription = '';
    this.showFoundItemModal.set(true);
  }

  async submitFoundItemReport() {
    const t = this.selectedTrip();
    const u = this.authService.user();
    if (!t || !u || !this.foundItemDescription.trim()) return;

    this.foundItemLoading.set(true);
    try {
      const itemId = `found_${Math.random().toString(36).substring(2, 9)}`;
      const lostItem: LostItem = {
        id: itemId,
        tripId: t.id,
        reporterId: u.uid,
        reporterRole: 'driver',
        description: this.foundItemDescription,
        status: 'found',
        timestamp: new Date().toISOString(),
        passengerId: t.passengerId,
        driverId: u.uid,
        passengerName: t.passengerName || 'Passenger',
        driverName: u.displayName || 'Driver'
      };

      await setDoc(doc(getDb(), 'lost_items', itemId), lostItem);
      
      // Notify passenger
      const mailId = `mail_${Math.random().toString(36).substring(2, 9)}`;
      await setDoc(doc(getDb(), 'mail', mailId), {
        to: t.passengerId,
        message: {
          subject: 'A Driver Found Your Item!',
          text: `The driver for trip ${t.id} has reported finding an item: ${this.foundItemDescription}. Please check the Lost Items section in your app.`,
          html: `<p>The driver for trip <b>${t.id}</b> has reported finding an item: <b>${this.foundItemDescription}</b>.</p><p>Please check the <b>Lost Items</b> section in your app to contact the driver.</p>`
        }
      });

      alert('Report submitted successfully. The passenger has been notified.');
      this.showFoundItemModal.set(false);
    } catch (error) {
      console.error('Failed to submit found item report', error);
      handleFirestoreError(error, OperationType.WRITE, 'lost_items');
      alert('Failed to submit report. Please try again.');
    } finally {
      this.foundItemLoading.set(false);
    }
  }

  private cleanupSubscription() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}
