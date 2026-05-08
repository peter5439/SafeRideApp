import {Component, signal, inject, effect} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule} from '@angular/common';
import {getDb, handleFirestoreError, OperationType} from '../../../firebase';
import {collection, query, where, onSnapshot, orderBy, getDoc, doc, Unsubscribe, runTransaction, setDoc} from 'firebase/firestore';
import {Trip, Rating, DriverProfile, LostItem} from '../../../models/types';
import {AuthService} from '../../../services/auth';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-passenger-history',
  imports: [RouterLink, MatIconModule, CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-50 flex flex-col">
      <!-- Header -->
      <header class="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-100 sticky top-0 z-10">
        <a routerLink="/passenger/home" class="text-slate-600">
          <mat-icon>arrow_back</mat-icon>
        </a>
        <h1 class="font-bold text-lg">Trip History</h1>
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
                    <mat-icon>directions_car</mat-icon>
                  </div>
                  <div>
                    <h3 class="font-bold text-slate-900">{{ trip.driverName || 'Verified Driver' }}</h3>
                    <p class="text-xs text-slate-500">{{ trip.timestamp | date:'medium' }}</p>
                    @if (trip.status === 'active') {
                      <span class="inline-flex items-center gap-1 text-[10px] font-bold text-accent uppercase mt-1">
                        <span class="w-1.5 h-1.5 bg-accent rounded-full animate-ping"></span>
                        In Progress
                      </span>
                    }
                  </div>
                </div>
                
                <div class="flex items-center gap-2">
                  @if (trip.status === 'active') {
                    <a [routerLink]="['/passenger/ride', trip.id]" class="bg-accent text-white px-3 py-1.5 rounded-lg text-xs font-bold">View</a>
                  } @else {
                    <div class="flex flex-col gap-2">
                      @if (!trip.ratingId) {
                        <button (click)="openRatingModal(trip)" class="bg-amber-100 text-amber-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
                          <mat-icon class="text-xs">star</mat-icon> Rate
                        </button>
                      } @else {
                        <div class="flex items-center gap-1 text-amber-400">
                          <mat-icon class="text-sm">star</mat-icon>
                          <span class="text-xs font-bold">Rated</span>
                        </div>
                      }
                      <button (click)="openLostItemModal(trip)" class="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
                        <mat-icon class="text-xs">search</mat-icon> Lost Item
                      </button>
                    </div>
                  }
                </div>
              </div>
            } @empty {
              <div class="text-center py-20">
                <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                  <mat-icon class="text-5xl">history</mat-icon>
                </div>
                <h2 class="text-xl font-bold text-slate-900 mb-2">No Trips Yet</h2>
                <p class="text-slate-500 text-sm">Your scanned trips will appear here for your records.</p>
              </div>
            }
          </div>
        }
      </main>
    </div>

    <!-- Rating Modal -->
    @if (showRatingModal()) {
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
        <div class="bg-white w-full max-w-sm rounded-[32px] p-8 animate-scale-in">
          <div class="flex flex-col items-center text-center">
            <div class="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-amber-400 mb-6">
              <mat-icon class="text-4xl">star</mat-icon>
            </div>
            <h2 class="text-2xl font-bold text-slate-900 mb-2">Rate Your Driver</h2>
            <p class="text-slate-500 text-sm mb-8">How was your experience with {{ selectedTrip()?.driverName }}?</p>
            
            <!-- Stars -->
            <div class="flex items-center gap-2 mb-8">
              @for (star of [1,2,3,4,5]; track star) {
                <button (click)="selectedRating.set(star)" class="transition-transform active:scale-90">
                  <mat-icon [class]="'text-4xl ' + (selectedRating() >= star ? 'text-amber-400' : 'text-slate-200')">
                    {{ selectedRating() >= star ? 'star' : 'star_outline' }}
                  </mat-icon>
                </button>
              }
            </div>

            <textarea 
              [(ngModel)]="ratingComment"
              placeholder="Leave a comment (optional)"
              class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm mb-8 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[100px]"
            ></textarea>

            <div class="flex flex-col w-full gap-3">
              <button 
                (click)="submitRating()" 
                [disabled]="selectedRating() === 0 || ratingLoading()"
                class="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                @if (ratingLoading()) {
                  <div class="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                } @else {
                  Submit Rating
                }
              </button>
              <button (click)="showRatingModal.set(false)" class="text-slate-400 font-bold text-sm py-2">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Lost Item Modal -->
    @if (showLostItemModal()) {
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
        <div class="bg-white w-full max-w-sm rounded-[32px] p-8 animate-scale-in">
          <div class="flex flex-col items-center text-center">
            <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-6">
              <mat-icon class="text-4xl">inventory_2</mat-icon>
            </div>
            <h2 class="text-2xl font-bold text-slate-900 mb-2">Report Lost Item</h2>
            <p class="text-slate-500 text-sm mb-8">Tell us what you lost during your ride with {{ selectedTrip()?.driverName }}.</p>
            
            <textarea 
              [(ngModel)]="lostItemDescription"
              placeholder="Describe the item (e.g., Black leather wallet, iPhone 13 with blue case)"
              class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm mb-8 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[120px]"
            ></textarea>

            <div class="flex flex-col w-full gap-3">
              <button 
                (click)="submitLostItemReport()" 
                [disabled]="!lostItemDescription.trim() || lostItemLoading()"
                class="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                @if (lostItemLoading()) {
                  <div class="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                } @else {
                  Submit Report
                }
              </button>
              <button (click)="showLostItemModal.set(false)" class="text-slate-400 font-bold text-sm py-2">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes scale-in {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .animate-scale-in {
      animation: scale-in 0.2s ease-out;
    }
  `]
})
export class PassengerHistory {
  authService = inject(AuthService);
  trips = signal<Trip[]>([]);
  private unsubscribe: Unsubscribe | null = null;

  // Rating signals
  showRatingModal = signal(false);
  selectedTrip = signal<Trip | null>(null);
  selectedRating = signal(0);
  ratingComment = '';
  ratingLoading = signal(false);

  // Lost Item signals
  showLostItemModal = signal(false);
  lostItemDescription = '';
  lostItemLoading = signal(false);

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

  openRatingModal(trip: Trip) {
    this.selectedTrip.set(trip);
    this.selectedRating.set(0);
    this.ratingComment = '';
    this.showRatingModal.set(true);
  }

  async submitRating() {
    const t = this.selectedTrip();
    const u = this.authService.user();
    if (!t || !u || this.selectedRating() === 0) return;

    this.ratingLoading.set(true);
    try {
      const ratingId = `rating_${Math.random().toString(36).substring(2, 9)}`;
      const rating: Rating = {
        id: ratingId,
        tripId: t.id,
        passengerId: u.uid,
        driverId: t.driverId,
        score: this.selectedRating(),
        comment: this.ratingComment,
        timestamp: new Date().toISOString()
      };

      await runTransaction(getDb(), async (transaction) => {
        const driverRef = doc(getDb(), 'drivers', t.driverId);
        const driverSnap = await transaction.get(driverRef);
        
        if (!driverSnap.exists()) throw new Error("Driver does not exist!");

        const driverData = driverSnap.data() as DriverProfile;
        const currentRating = driverData.rating || 0;
        const currentCount = driverData.ratingCount || 0;
        
        const newCount = currentCount + 1;
        const newRating = ((currentRating * currentCount) + this.selectedRating()) / newCount;

        transaction.set(doc(getDb(), 'ratings', ratingId), rating);
        transaction.update(driverRef, {
          rating: newRating,
          ratingCount: newCount
        });
        transaction.update(doc(getDb(), 'trips', t.id), {
          ratingId: ratingId
        });
      });

      alert('Thank you for your rating!');
      this.showRatingModal.set(false);
    } catch (error) {
      console.error('Failed to submit rating', error);
      handleFirestoreError(error, OperationType.WRITE, 'ratings');
      alert('Failed to submit rating. Please try again.');
    } finally {
      this.ratingLoading.set(false);
    }
  }

  openLostItemModal(trip: Trip) {
    this.selectedTrip.set(trip);
    this.lostItemDescription = '';
    this.showLostItemModal.set(true);
  }

  async submitLostItemReport() {
    const t = this.selectedTrip();
    const u = this.authService.user();
    if (!t || !u || !this.lostItemDescription.trim()) return;

    this.lostItemLoading.set(true);
    try {
      const itemId = `lost_${Math.random().toString(36).substring(2, 9)}`;
      const lostItem: LostItem = {
        id: itemId,
        tripId: t.id,
        reporterId: u.uid,
        reporterRole: 'passenger',
        description: this.lostItemDescription,
        status: 'reported',
        timestamp: new Date().toISOString(),
        passengerId: u.uid,
        driverId: t.driverId,
        passengerName: u.displayName || 'Passenger',
        driverName: t.driverName || 'Driver'
      };

      await setDoc(doc(getDb(), 'lost_items', itemId), lostItem);
      
      // Also send a notification (simulated via mail collection)
      const mailId = `mail_${Math.random().toString(36).substring(2, 9)}`;
      await setDoc(doc(getDb(), 'mail', mailId), {
        to: t.driverId, // In a real app, this would be the driver's email
        message: {
          subject: 'Lost Item Reported',
          text: `A passenger reported a lost item for trip ${t.id}: ${this.lostItemDescription}`,
          html: `<p>A passenger reported a lost item for trip <b>${t.id}</b>:</p><p>${this.lostItemDescription}</p>`
        }
      });

      alert('Report submitted successfully. The driver has been notified.');
      this.showLostItemModal.set(false);
    } catch (error) {
      console.error('Failed to submit lost item report', error);
      handleFirestoreError(error, OperationType.WRITE, 'lost_items');
      alert('Failed to submit report. Please try again.');
    } finally {
      this.lostItemLoading.set(false);
    }
  }

  private setupSubscription(uid: string) {
    this.cleanupSubscription();
    const path = 'trips';
    const q = query(
      collection(getDb(), path), 
      where('passengerId', '==', uid),
      orderBy('timestamp', 'desc')
    );
    
    this.unsubscribe = onSnapshot(q, async (snapshot) => {
      const tripData = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Trip));
      
      // Fetch driver names for each trip
      const tripsWithNames = await Promise.all(tripData.map(async (trip: Trip) => {
        try {
          const driverDoc = await getDoc(doc(getDb(), 'drivers', trip.driverId));
          return {
            ...trip,
            driverName: driverDoc.exists() ? (driverDoc.data() as { displayName: string })['displayName'] : 'Unknown Driver'
          };
        } catch {
          return { ...trip, driverName: 'Unknown Driver' };
        }
      }));
      
      this.trips.set(tripsWithNames);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  }

  private cleanupSubscription() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}
