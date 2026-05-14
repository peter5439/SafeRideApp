import {Component, inject, signal, OnInit} from '@angular/core';
import {ActivatedRoute, RouterLink, Router} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule} from '@angular/common';
import {getDb, handleFirestoreError, OperationType} from '../../../firebase';
import {doc, getDoc, setDoc, query, collection, where, getDocs} from 'firebase/firestore';
import {DriverProfile, Vehicle, Trip, EmergencyContact} from '../../../models/types';
import {AuthService} from '../../../services/auth';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-passenger-driver-details',
  imports: [RouterLink, MatIconModule, CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-50 flex flex-col">
      <!-- Header -->
      <header class="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-100">
        <a routerLink="/passenger/home" class="text-slate-600">
          <mat-icon>close</mat-icon>
        </a>
        <h1 class="font-bold text-lg">Driver Details</h1>
        <button (click)="authService.logout()" class="text-slate-400 hover:text-danger transition-colors">
          <mat-icon>logout</mat-icon>
        </button>
      </header>

      @if (loading()) {
        <div class="flex-1 flex items-center justify-center">
          <div class="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      } @else if (driver()) {
        <main class="flex-1 p-6 max-w-md mx-auto w-full">
          <!-- Driver Profile Card -->
          <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6 flex flex-col items-center text-center">
            <div class="relative mb-4">
              <img [src]="driver()?.profilePhotoUrl || 'https://picsum.photos/seed/driver/200/200'" 
                   class="w-24 h-24 rounded-full object-cover border-4 border-primary/10" 
                   referrerpolicy="no-referrer" [alt]="driver()?.displayName">
              <div class="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1 border-2 border-white shadow-sm">
                <mat-icon class="text-sm">verified</mat-icon>
              </div>
            </div>
            <h2 class="text-xl font-bold text-slate-900">{{ driver()?.displayName }}</h2>
            <div class="flex items-center gap-1 text-primary font-bold text-sm mb-4">
              <mat-icon class="text-sm">verified</mat-icon> Verified Driver
            </div>
            
            <div class="w-full grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
              <div class="text-left">
                <span class="text-[10px] uppercase tracking-wider text-slate-400 font-bold">License</span>
                <p class="font-bold text-slate-700">{{ driver()?.licenseNumber || 'ABC-12345' }}</p>
              </div>
              <div class="text-left">
                <span class="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Rating</span>
                <p class="font-bold text-slate-700 flex items-center gap-1">
                  {{ (driver()?.rating || 0).toFixed(1) }} 
                  <mat-icon class="text-amber-400 text-sm">star</mat-icon>
                  <span class="text-[10px] text-slate-400 font-normal">({{ driver()?.ratingCount || 0 }})</span>
                </p>
              </div>
            </div>
          </div>
          
          <!-- Personalized Common Routes -->
          @if ((driver()?.commonRoutes || []).length > 0) {
            <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
              <h3 class="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <mat-icon class="text-primary">trending_up</mat-icon> Driver's Common Routes
              </h3>
              <div class="space-y-3">
                @for (route of driver()?.commonRoutes; track route.id) {
                  <div class="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm">
                        <mat-icon>route</mat-icon>
                      </div>
                      <div class="text-left">
                        <p class="text-xs font-bold text-slate-900">{{ route.from }} → {{ route.to }}</p>
                        <div class="flex items-center gap-2 mt-0.5">
                          <span class="text-[9px] text-slate-400 font-mono">{{ route.distance || 'Varies' }} • {{ route.estimatedTime }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="text-right">
                      <p class="text-xs font-bold text-slate-900">₦{{ route.baseFare }}</p>
                      <p class="text-[8px] font-black uppercase tracking-widest text-slate-400">Price</p>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Vehicle Details Card -->
          <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-8">
            <h3 class="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <mat-icon class="text-slate-400">directions_car</mat-icon> Vehicle Information
            </h3>
            <div class="space-y-4">
              <div class="flex justify-between items-center">
                <span class="text-slate-500 text-sm">Plate Number</span>
                <span class="font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">{{ vehicle()?.plateNumber || 'KAA 001Z' }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-slate-500 text-sm">Model</span>
                <span class="font-bold text-slate-900">{{ vehicle()?.model || 'Toyota Corolla' }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-slate-500 text-sm">Color</span>
                <span class="font-bold text-slate-900">{{ vehicle()?.color || 'White' }}</span>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="space-y-4">
            <button (click)="startRide()" [disabled]="rideLoading()" class="w-full bg-accent text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-accent/20 active:scale-95 transition-all disabled:opacity-50">
              @if (rideLoading()) {
                <div class="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              } @else {
                <mat-icon>play_arrow</mat-icon> Start Ride
              }
            </button>
            <button (click)="shareDetails()" class="w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all">
              <mat-icon>share</mat-icon> Share Driver Details
            </button>
            <a routerLink="/passenger/emergency" class="w-full bg-danger/10 text-danger py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all">
              <mat-icon>emergency</mat-icon> Emergency Button
            </a>
          </div>
        </main>
      } @else {
        <div class="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <mat-icon class="text-6xl text-slate-200 mb-4">error_outline</mat-icon>
          <h2 class="text-xl font-bold text-slate-900 mb-2">Driver Not Found</h2>
          <p class="text-slate-500 mb-6">We couldn't find any driver with this ID. Please scan again.</p>
          <a routerLink="/passenger/scan" class="bg-primary text-white px-8 py-3 rounded-xl font-bold">Scan Again</a>
        </div>
      }
    </div>

    <!-- Share Modal -->
    @if (showShareModal()) {
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 z-50">
        <div class="bg-white w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] p-8 animate-slide-up sm:animate-scale-in">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-slate-900">Share Driver Details</h2>
            <button (click)="showShareModal.set(false)" class="text-slate-400">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <p class="text-slate-500 text-sm mb-6">Send driver information to your trusted contacts.</p>

          <div class="space-y-3 mb-8">
            <button (click)="copyShareLink()" class="w-full flex items-center gap-4 p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors text-left group">
              <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                <mat-icon>content_copy</mat-icon>
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
  `,
  styles: [`
    @keyframes slide-up {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    @keyframes scale-in {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .animate-slide-up {
      animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .animate-scale-in {
      animation: scale-in 0.2s ease-out;
    }
  `]
})
export class PassengerDriverDetails implements OnInit {
  route = inject(ActivatedRoute);
  router = inject(Router);
  authService = inject(AuthService);
  driver = signal<DriverProfile | null>(null);
  vehicle = signal<Vehicle | null>(null);
  loading = signal(true);
  rideLoading = signal(false);
  showShareModal = signal(false);
  contacts = signal<EmergencyContact[]>([]);
  contactsLoading = signal(false);
  
  async ngOnInit() {
    // Check if user is logged in
    if (!this.authService.user()) {
      this.authService.redirectUrl = this.router.url;
      await this.router.navigate(['/passenger/login']);
      return;
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      await this.fetchDriverData(id);
    } else {
      this.loading.set(false);
    }
  }

  async startRide() {
    const d = this.driver();
    const u = this.authService.user();
    if (!d || !u) return;

    this.rideLoading.set(true);
    try {
      const tripId = `trip_${Math.random().toString(36).substring(2, 9)}`;
      const trip: Trip = {
        id: tripId,
        passengerId: u.uid,
        passengerName: u.displayName || 'SafeRide Passenger',
        driverId: d.uid,
        driverName: d.displayName,
        timestamp: new Date().toISOString(),
        status: 'active',
        location: {
          latitude: 0, // In a real app, we'd get current location
          longitude: 0
        }
      };
      await setDoc(doc(getDb(), 'trips', tripId), trip);
      await this.router.navigate(['/passenger/ride', tripId]);
    } catch (error) {
      console.error('Failed to start ride', error);
      handleFirestoreError(error, OperationType.WRITE, 'trips');
      alert('Failed to start ride. Please try again.');
    } finally {
      this.rideLoading.set(false);
    }
  }

  async fetchDriverData(id: string) {
    try {
      const driverDoc = await getDoc(doc(getDb(), 'drivers', id));
      if (driverDoc.exists()) {
        const data = driverDoc.data() as DriverProfile;
        this.driver.set(data);
        
        if (data.vehicleId) {
          const vehicleDoc = await getDoc(doc(getDb(), 'vehicles', data.vehicleId));
          if (vehicleDoc.exists()) {
            this.vehicle.set({ id: vehicleDoc.id, ...vehicleDoc.data() } as Vehicle);
          }
        }
      } else {
        // Fallback for demo if no real driver exists
        if (id.startsWith('demo')) {
          this.driver.set({
            uid: id,
            email: 'driver@example.com',
            displayName: 'John Doe',
            role: 'driver',
            phoneNumber: '+1234567890',
            verificationStatus: 'verified',
            vehicleId: 'veh_demo',
            createdAt: new Date().toISOString(),
            firstName: 'John',
            lastName: 'Doe',
            dob: '1990-01-01',
            gender: 'Male',
            residentialAddress: '123 Main St',
            stateCity: 'Lagos',
            nationality: 'Nigerian',
            nin: '12345678901',
            idType: 'National ID',
            idNumber: 'ID123456',
            licenseNumber: 'DL-998877',
            licenseIssuingAuthority: 'FRSC',
            licenseIssueDate: '2020-01-01',
            licenseExpiryDate: '2025-01-01',
            licenseClass: 'B',
            plateNumber: 'KAA 001Z',
            model: 'Corolla',
            make: 'Toyota',
            color: 'White',
            year: '2015'
          } as DriverProfile);
          this.vehicle.set({
            id: 'veh_demo',
            driverId: id,
            plateNumber: 'KAA 001Z',
            make: 'Toyota',
            model: 'Corolla',
            year: '2015',
            color: 'White',
            ownerName: 'John Doe'
          } as Vehicle);
        }
      }
    } catch (error) {
      console.error('Error fetching driver data', error);
    } finally {
      this.loading.set(false);
    }
  }

  shareDetails() {
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
    const driverName = this.driver()?.displayName;
    const vehicleInfo = `${this.vehicle()?.make} ${this.vehicle()?.model} (${this.vehicle()?.plateNumber})`;
    const message = `I am about to start a ride with ${driverName} in a ${vehicleInfo}. Driver verified by LagosRide.`;
    
    // In a real app we might use an SMS API or navigator.share if possible
    alert(`Driver details shared with ${contact.name}:\n\n"${message}"`);
  }

  copyShareLink() {
    const driverId = this.driver()?.uid;
    const shareUrl = `${window.location.origin}/passenger/driver/${driverId}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('Driver profile link copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy', err);
    });
  }
}
