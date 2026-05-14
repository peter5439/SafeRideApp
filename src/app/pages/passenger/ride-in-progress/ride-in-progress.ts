import {Component, inject, signal, OnInit, OnDestroy} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule} from '@angular/common';
import {getDb, handleFirestoreError, OperationType} from '../../../firebase';
import {doc, getDoc, updateDoc, runTransaction, collection, query, where, getDocs} from 'firebase/firestore';
import {DriverProfile, Trip, Rating, EmergencyContact} from '../../../models/types';
import {AuthService} from '../../../services/auth';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-ride-in-progress',
  standalone: true,
  imports: [MatIconModule, CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-slate-50 flex flex-col">
      <!-- Header -->
      <header class="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-100 sticky top-0 z-10">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-accent rounded-lg flex items-center justify-center animate-pulse">
            <mat-icon class="text-white text-sm">local_taxi</mat-icon>
          </div>
          <h1 class="font-bold text-lg">Ride in Progress</h1>
        </div>
        <div class="flex items-center gap-2 text-accent font-bold text-xs uppercase tracking-widest">
          <span class="w-2 h-2 bg-accent rounded-full animate-ping"></span>
          Live
        </div>
      </header>

      @if (loading()) {
        <div class="flex-1 flex items-center justify-center">
          <div class="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
      } @else if (trip()) {
        <main class="flex-1 p-6 max-w-md mx-auto w-full">
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
                  <mat-icon class="text-sm">schedule</mat-icon>
                </div>
                <div>
                  <p class="text-[10px] font-bold text-slate-400 uppercase">Started</p>
                  <p class="text-xs font-bold text-slate-700">{{ trip()?.timestamp | date:'shortTime' }}</p>
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

          <!-- Safety Features -->
          <div class="grid grid-cols-3 gap-3 mb-8">
            <a routerLink="/passenger/emergency" class="bg-danger/10 p-4 rounded-2xl border border-danger/20 flex flex-col items-center gap-2 text-danger active:scale-95 transition-all">
              <mat-icon>emergency</mat-icon>
              <span class="text-[10px] font-bold">Panic</span>
            </a>
            <button (click)="openShareModal()" class="bg-primary/10 p-4 rounded-2xl border border-primary/20 flex flex-col items-center gap-2 text-primary active:scale-95 transition-all">
              <mat-icon>share</mat-icon>
              <span class="text-[10px] font-bold">Share</span>
            </button>
            <button (click)="showReportModal.set(true)" class="bg-amber-100 p-4 rounded-2xl border border-amber-200 flex flex-col items-center gap-2 text-amber-700 active:scale-95 transition-all">
              <mat-icon>flag</mat-icon>
              <span class="text-[10px] font-bold">Flag Driver</span>
            </button>
          </div>

          <!-- Map Placeholder -->
          <div class="bg-slate-200 rounded-3xl aspect-square mb-8 flex items-center justify-center relative overflow-hidden border border-slate-200 shadow-inner">
            <img src="https://picsum.photos/seed/map/600/600?blur=2" class="absolute inset-0 w-full h-full object-cover opacity-50" referrerpolicy="no-referrer" alt="Trip Map">
            <div class="relative z-10 flex flex-col items-center">
              <div class="w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center text-accent mb-2">
                <mat-icon>navigation</mat-icon>
              </div>
              <p class="text-xs font-bold text-slate-600 bg-white/80 backdrop-blur px-3 py-1 rounded-full">Tracking active...</p>
            </div>
          </div>

          <!-- End Ride Button -->
          <button (click)="endRide()" [disabled]="endLoading()" class="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20 active:scale-95 transition-all disabled:opacity-50">
            @if (endLoading()) {
              <div class="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            } @else {
              <mat-icon>stop</mat-icon> End Ride
            }
          </button>
        </main>
      } @else {
        <div class="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <mat-icon class="text-6xl text-slate-200 mb-4">error_outline</mat-icon>
          <h2 class="text-xl font-bold text-slate-900 mb-2">Ride Not Found</h2>
          <p class="text-slate-500 mb-6">This ride session may have expired or was never started.</p>
          <a routerLink="/passenger/home" class="bg-primary text-white px-8 py-3 rounded-xl font-bold">Back Home</a>
        </div>
      }
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
            <p class="text-slate-500 text-sm mb-8">How was your experience with {{ driver()?.displayName }}?</p>
            
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
              <button (click)="closeRatingModal()" class="text-slate-400 font-bold text-sm py-2">
                Skip for now
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Share Modal -->
    @if (showShareModal()) {
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 z-50">
        <div class="bg-white w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] p-8 animate-slide-up sm:animate-scale-in">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-slate-900">Share Trip Details</h2>
            <button (click)="showShareModal.set(false)" class="text-slate-400">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <p class="text-slate-500 text-sm mb-6">Keep your loved ones informed about your current ride.</p>

          <div class="space-y-3 mb-8">
            <button (click)="copyTripLink()" class="w-full flex items-center gap-4 p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors text-left group">
              <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                <mat-icon>link</mat-icon>
              </div>
              <div>
                <p class="text-sm font-bold text-slate-900">Copy Link</p>
                <p class="text-[10px] text-slate-400 font-bold uppercase">Share via any app</p>
              </div>
            </button>

            <div class="pt-4 pb-2">
              <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Emergency Contacts</h3>
            </div>

            @if (contactsLoading()) {
              <div class="flex justify-center py-4">
                <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            } @else if (contacts().length > 0) {
              @for (contact of contacts(); track contact.id) {
                <button (click)="shareWithContact(contact)" class="w-full flex items-center gap-4 p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors text-left group">
                  <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-600 font-bold">
                    {{ contact.name.charAt(0) }}
                  </div>
                  <div class="flex-1">
                    <p class="text-sm font-bold text-slate-900">{{ contact.name }}</p>
                    <p class="text-[10px] text-slate-400 font-bold uppercase">{{ contact.phoneNumber }}</p>
                  </div>
                  <mat-icon class="text-slate-300 group-hover:text-primary">send</mat-icon>
                </button>
              }
            } @else {
              <div class="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-center">
                <p class="text-xs text-amber-600 font-medium">No emergency contacts found.</p>
                <a routerLink="/passenger/contacts" class="text-[10px] font-bold text-amber-700 uppercase mt-1 block">Add Contacts</a>
              </div>
            }
          </div>

          <button (click)="showShareModal.set(false)" class="w-full py-4 text-slate-400 font-bold text-sm">
            Done
          </button>
        </div>
      </div>
    }

    <!-- Report Driver Modal -->
    @if (showReportModal()) {
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
        <div class="bg-white w-full max-w-sm rounded-[32px] p-8 animate-scale-in">
          <div class="flex flex-col items-center text-center">
            <div class="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mb-6">
              <mat-icon class="text-4xl">warning</mat-icon>
            </div>
            <h2 class="text-2xl font-bold text-slate-900 mb-2">Flag Driver</h2>
            <p class="text-slate-500 text-sm mb-6">Reporting a driver will notify the LagosRide admin team for investigation.</p>

            <div class="w-full space-y-2 mb-8">
              @for (reason of reportReasons; track reason) {
                <button (click)="submitReport(reason)" class="w-full p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl text-left transition-colors border border-slate-100">
                  <p class="text-sm font-bold text-slate-700">{{ reason }}</p>
                </button>
              }
            </div>

            <button (click)="showReportModal.set(false)" class="text-slate-400 font-bold text-sm py-2">
              Cancel
            </button>
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
    @keyframes slide-up {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    .animate-scale-in {
      animation: scale-in 0.2s ease-out;
    }
    .animate-slide-up {
      animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
  `]
})
export class RideInProgress implements OnInit, OnDestroy {
  route = inject(ActivatedRoute);
  router = inject(Router);
  authService = inject(AuthService);
  
  trip = signal<Trip | null>(null);
  driver = signal<DriverProfile | null>(null);
  loading = signal(true);
  endLoading = signal(false);

  // Rating signals
  showRatingModal = signal(false);
  selectedRating = signal(0);
  ratingComment = '';
  ratingLoading = signal(false);

  // Share signals
  showShareModal = signal(false);
  contacts = signal<EmergencyContact[]>([]);
  contactsLoading = signal(false);

  // Report signals
  showReportModal = signal(false);
  reportReasons = [
    'Reckless Driving',
    'Unprofessional Behavior',
    'Vehicle Condition',
    'Safety Concern',
    'Other'
  ];

  async submitReport(reason: string) {
    const t = this.trip();
    const u = this.authService.user();
    const profile = this.authService.profile();
    if (!t || !u || !profile) return;

    try {
      const incidentId = `report_${Math.random().toString(36).substring(2, 9)}`;
      await runTransaction(getDb(), async (transaction) => {
        const driverRef = doc(getDb(), 'drivers', t.driverId);
        const reportCountDoc = await transaction.get(driverRef);
        const currentReports = reportCountDoc.exists() ? (reportCountDoc.data() as DriverProfile).reportCount || 0 : 0;

        transaction.set(doc(getDb(), 'incidents', incidentId), {
          id: incidentId,
          reporterId: u.uid,
          reporterName: profile.displayName || u.displayName || 'Anonymous',
          reporterEmail: u.email || profile.email || '',
          driverId: t.driverId,
          driverName: t.driverName || 'Unknown Driver',
          tripId: t.id,
          description: `Reported for: ${reason}`,
          severity: 'medium',
          status: 'open',
          timestamp: new Date().toISOString()
        });

        transaction.update(driverRef, {
          reportCount: currentReports + 1
        });
      });

      alert('Driver has been flagged. Our safety team will review this incident.');
      this.showReportModal.set(false);
    } catch (error) {
      console.error('Failed to report driver', error);
      alert('Failed to submit report. Please try again or use the Panic button if in immediate danger.');
    }
  }

  private locationInterval: ReturnType<typeof setInterval> | undefined;

  async ngOnInit() {
    const tripId = this.route.snapshot.paramMap.get('tripId');
    if (tripId) {
      await this.fetchTripData(tripId);
      this.startLocationUpdates(tripId);
    } else {
      this.loading.set(false);
    }
  }

  startLocationUpdates(tripId: string) {
    // Update location every 30 seconds
    this.locationInterval = setInterval(() => {
      this.updateCurrentLocation(tripId);
    }, 30000);
    
    // Immediate first update
    this.updateCurrentLocation(tripId);
  }

  async updateCurrentLocation(tripId: string) {
    if (this.trip()?.status !== 'active') {
      if (this.locationInterval) clearInterval(this.locationInterval);
      return;
    }

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      await updateDoc(doc(getDb(), 'trips', tripId), {
        currentLocation: {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        }
      });
    } catch (e) {
      console.warn('Could not update live location', e);
    }
  }

  ngOnDestroy() {
    if (this.locationInterval) {
      clearInterval(this.locationInterval);
    }
  }

  async fetchTripData(tripId: string) {
    try {
      const tripDoc = await getDoc(doc(getDb(), 'trips', tripId));
      if (tripDoc.exists()) {
        const tripData = { id: tripDoc.id, ...tripDoc.data() } as Trip;
        this.trip.set(tripData);
        
        // Fetch driver data
        const driverDoc = await getDoc(doc(getDb(), 'drivers', tripData.driverId));
        if (driverDoc.exists()) {
          this.driver.set(driverDoc.data() as DriverProfile);
        }
      }
    } catch (error) {
      console.error('Error fetching trip data', error);
    } finally {
      this.loading.set(false);
    }
  }

  async endRide() {
    const t = this.trip();
    if (!t) return;

    this.endLoading.set(true);
    try {
      await updateDoc(doc(getDb(), 'trips', t.id), {
        status: 'completed'
      });
      this.showRatingModal.set(true);
    } catch (error) {
      console.error('Failed to end ride', error);
      handleFirestoreError(error, OperationType.UPDATE, `trips/${t.id}`);
      alert('Failed to end ride. Please try again.');
    } finally {
      this.endLoading.set(false);
    }
  }

  async submitRating() {
    const t = this.trip();
    const d = this.driver();
    const u = this.authService.user();
    if (!t || !d || !u || this.selectedRating() === 0) return;

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
      await this.router.navigate(['/passenger/home']);
    } catch (error) {
      console.error('Failed to submit rating', error);
      handleFirestoreError(error, OperationType.WRITE, 'ratings');
      alert('Failed to submit rating. Your ride was still ended.');
      await this.router.navigate(['/passenger/home']);
    } finally {
      this.ratingLoading.set(false);
      this.showRatingModal.set(false);
    }
  }

  closeRatingModal() {
    this.showRatingModal.set(false);
    this.router.navigate(['/passenger/home']);
  }

  async openShareModal() {
    this.showShareModal.set(true);
    const user = this.authService.user();
    if (user && this.contacts().length === 0) {
      this.fetchContacts(user.uid);
    }
  }

  async fetchContacts(uid: string) {
    this.contactsLoading.set(true);
    try {
      const q = query(
        collection(getDb(), 'emergency_contacts'),
        where('userId', '==', uid)
      );
      const snapshot = await getDocs(q);
      this.contacts.set(snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as EmergencyContact)));
    } catch (error) {
      console.error('Error fetching contacts', error);
    } finally {
      this.contactsLoading.set(false);
    }
  }

  shareWithContact(contact: EmergencyContact) {
    // In a real app, this might trigger an SMS or an internal notification system
    alert(`Trip details shared with ${contact.name} via ${contact.phoneNumber}`);
  }

  copyTripLink() {
    const tripId = this.trip()?.id;
    const shareUrl = `${window.location.origin}/share/trip/${tripId}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Track my ride',
        text: `I'm on a ride with ${this.driver()?.displayName}. Track me here:`,
        url: shareUrl
      }).catch(() => {
        this.copyToClipboard(shareUrl);
      });
    } else {
      this.copyToClipboard(shareUrl);
    }
  }

  private copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      alert('Trip tracking link copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy link', err);
      alert('Failed to copy link. Trip ID: ' + this.trip()?.id);
    });
  }
}
