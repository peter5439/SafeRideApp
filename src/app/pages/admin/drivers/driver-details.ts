import {Component, signal, inject, OnInit} from '@angular/core';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule} from '@angular/common';
import {getDb, handleFirestoreError, OperationType} from '../../../firebase';
import {doc, getDoc, collection, query, where, getDocs, orderBy, limit, updateDoc} from 'firebase/firestore';
import {DriverProfile, Trip} from '../../../models/types';
import {AuthService} from '../../../services/auth';

@Component({
  selector: 'app-admin-driver-details',
  imports: [RouterLink, MatIconModule, CommonModule],
  template: `
    <div class="min-h-screen bg-slate-50 flex">
      <!-- Sidebar -->
      <aside class="w-64 bg-slate-900 text-white hidden lg:flex flex-col">
        <div class="p-6 flex items-center gap-3">
          <div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <mat-icon class="text-white text-sm">verified_user</mat-icon>
          </div>
          <span class="font-display font-bold text-xl tracking-tight">SafeRide Admin</span>
        </div>
        <nav class="flex-1 px-4 py-6 space-y-2">
          <a routerLink="/admin/dashboard" class="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all">
            <mat-icon>dashboard</mat-icon> Dashboard
          </a>
          <a routerLink="/admin/drivers" class="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary text-white font-bold">
            <mat-icon>directions_car</mat-icon> Drivers
          </a>
          <a routerLink="/admin/incidents" class="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all">
            <mat-icon>report_problem</mat-icon> Incidents
          </a>
          <a routerLink="/admin/passengers" class="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all">
            <mat-icon>people</mat-icon> Passengers
          </a>
          <a routerLink="/admin/lost-items" class="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all">
            <mat-icon>inventory_2</mat-icon> Lost Items
          </a>
        </nav>

        <div class="p-6 mt-auto border-t border-white/5">
          <button (click)="authService.logout()" class="flex items-center gap-3 text-slate-400 hover:text-white transition-colors">
            <mat-icon>logout</mat-icon> Logout
          </button>
        </div>
      </aside>

      <main class="flex-1 flex flex-col min-w-0">
        <header class="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <a routerLink="/admin/drivers" class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors">
              <mat-icon>arrow_back</mat-icon>
            </a>
            <h1 class="text-xl font-bold text-slate-900">Driver Details</h1>
          </div>
          @if (driver()) {
            <div class="flex items-center gap-3">
              @if (driver()?.verificationStatus === 'pending') {
                <button (click)="updateStatus('verified')" class="bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-green-600/20">
                  <mat-icon class="text-sm">check</mat-icon> Approve Driver
                </button>
                <button (click)="updateStatus('rejected')" class="bg-danger text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-danger/20">
                  <mat-icon class="text-sm">close</mat-icon> Reject
                </button>
              } @else {
                <span [class]="'text-xs font-black uppercase px-3 py-1.5 rounded-full ' + 
                  (driver()?.verificationStatus === 'verified' ? 'bg-green-100 text-green-700' : 
                   driver()?.verificationStatus === 'banned' ? 'bg-danger/10 text-danger' : 
                   'bg-slate-100 text-slate-500')">
                  {{ driver()?.verificationStatus }}
                </span>
                
                @if (driver()?.verificationStatus === 'verified') {
                  <button (click)="toggleBan()" class="bg-danger/10 text-danger px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 border border-danger/20">
                    <mat-icon class="text-sm">block</mat-icon> Ban Driver
                  </button>
                } @else if (driver()?.verificationStatus === 'banned') {
                  <button (click)="toggleUnban()" class="bg-primary/10 text-primary px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 border border-primary/20">
                    <mat-icon class="text-sm">verified</mat-icon> Unban Driver
                  </button>
                }
              }
            </div>
          }
        </header>

        <div class="p-8 overflow-y-auto">
          @if (loading()) {
            <div class="flex flex-col items-center justify-center py-20">
              <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p class="text-slate-400 font-bold uppercase tracking-widest">Loading Details</p>
            </div>
          } @else if (!driver()) {
            <div class="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
              <mat-icon class="text-6xl text-slate-200 mb-4">person_off</mat-icon>
              <h2 class="text-2xl font-bold mb-2">Driver Not Found</h2>
              <p class="text-slate-500 mb-8">The driver you are looking for does not exist or has been removed.</p>
              <a routerLink="/admin/drivers" class="bg-primary text-white px-8 py-3 rounded-2xl font-bold">
                Back to Drivers
              </a>
            </div>
          } @else {
            @if (driver()?.verificationStatus === 'banned') {
              <div class="mb-8 p-6 bg-danger/10 rounded-3xl border border-danger/20 flex items-start gap-4">
                <div class="bg-danger text-white p-3 rounded-2xl">
                  <mat-icon>warning</mat-icon>
                </div>
                <div>
                  <h3 class="text-danger font-bold text-lg">Indefinite Ban Active</h3>
                  <p class="text-danger/80 text-sm">This driver has been restricted from accessing the platform. QR code scans will be rejected.</p>
                  @if (driver()?.banReason) {
                    <p class="mt-2 text-xs font-bold text-danger">Reason: {{ driver()?.banReason }}</p>
                  }
                </div>
              </div>
            }

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <!-- Profile Info -->
              <div class="lg:col-span-1 space-y-8">
                <div class="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
                  <img [src]="driver()?.profilePhotoUrl || 'https://picsum.photos/seed/' + driver()?.uid + '/200/200'" 
                       class="w-32 h-32 rounded-full object-cover border-4 border-slate-50 mb-6" referrerpolicy="no-referrer" [alt]="driver()?.displayName">
                  <h2 class="text-2xl font-bold text-slate-900">{{ driver()?.displayName }}</h2>
                  <p class="text-slate-500 mb-6">{{ driver()?.email }}</p>
                  
                  <div class="w-full pt-6 border-t border-slate-50 space-y-4 text-left">
                    <div class="flex justify-between items-center">
                      <div>
                        <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Reports</p>
                        <p [class]="'text-sm font-bold ' + ((driver()?.reportCount || 0) > 0 ? 'text-danger' : 'text-slate-700')">
                          {{ driver()?.reportCount || 0 }} flagged incidents
                        </p>
                      </div>
                      <mat-icon [class]="(driver()?.reportCount || 0) > 3 ? 'text-danger animate-pulse' : 'text-slate-200'">report</mat-icon>
                    </div>
                    <div>
                      <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">License Number</p>
                      <p class="font-mono text-sm font-bold text-slate-700">{{ driver()?.licenseNumber }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Rating</p>
                      <p class="text-sm font-bold text-slate-700 flex items-center gap-1">
                        {{ (driver()?.rating || 0).toFixed(1) }} 
                        <mat-icon class="text-amber-400 text-sm">star</mat-icon>
                        <span class="text-[10px] text-slate-400 font-normal">({{ driver()?.ratingCount || 0 }})</span>
                      </p>
                    </div>
                    <div>
                      <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Registered Since</p>
                      <p class="text-sm font-bold text-slate-700">{{ driver()?.createdAt | date:'longDate' }}</p>
                    </div>
                  </div>
                </div>

                <div class="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                  <h3 class="font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <mat-icon class="text-primary">directions_car</mat-icon> Vehicle Information
                  </h3>
                  <div class="space-y-4">
                    <div class="flex justify-between items-center py-3 border-b border-slate-50">
                      <span class="text-sm text-slate-500">Plate Number</span>
                      <span class="font-mono font-bold text-slate-900">{{ driver()?.plateNumber }}</span>
                    </div>
                    <div class="flex justify-between items-center py-3 border-b border-slate-50">
                      <span class="text-sm text-slate-500">Model</span>
                      <span class="font-bold text-slate-900">{{ driver()?.model }}</span>
                    </div>
                    <div class="flex justify-between items-center py-3">
                      <span class="text-sm text-slate-500">Color</span>
                      <div class="flex items-center gap-2">
                        <div [style.backgroundColor]="driver()?.color" class="w-4 h-4 rounded-full border border-slate-200"></div>
                        <span class="font-bold text-slate-900 capitalize">{{ driver()?.color }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Activity & History -->
              <div class="lg:col-span-2 space-y-8">
                <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                  <div class="p-6 border-b border-slate-50 flex items-center justify-between">
                    <h3 class="font-bold text-slate-900">Recent Trip History</h3>
                    <span class="text-xs font-bold text-slate-400">{{ trips().length }} Total Trips</span>
                  </div>
                  <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                      <thead>
                        <tr class="bg-slate-50/50">
                          <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Passenger</th>
                          <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Time</th>
                          <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Location</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-50">
                        @for (trip of trips(); track trip.id) {
                          <tr class="hover:bg-slate-50/50 transition-colors">
                            <td class="px-6 py-4">
                              <div class="flex items-center gap-3">
                                <div class="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                                  <mat-icon class="text-sm">person</mat-icon>
                                </div>
                                <span class="text-sm font-bold text-slate-700">{{ trip.passengerName || 'SafeRide Passenger' }}</span>
                              </div>
                            </td>
                            <td class="px-6 py-4 text-sm text-slate-600">{{ trip.timestamp | date:'medium' }}</td>
                            <td class="px-6 py-4 text-xs text-slate-400">
                              @if (trip.location) {
                                {{ trip.location.latitude.toFixed(4) }}, {{ trip.location.longitude.toFixed(4) }}
                              } @else {
                                N/A
                              }
                            </td>
                          </tr>
                        } @empty {
                          <tr>
                            <td colspan="3" class="px-6 py-12 text-center text-slate-400 italic">No trip history found for this driver.</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>

                <!-- Verification Documents -->
                <div class="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                  <h3 class="font-bold text-slate-900 mb-6">Verification Documents</h3>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <!-- Identity Documents -->
                    <div class="space-y-6">
                      <h4 class="text-xs font-black uppercase tracking-widest text-slate-400">Identity (KYC)</h4>
                      <div class="grid grid-cols-2 gap-4">
                        @if (driver()?.idFrontPhotoUrl) {
                          <button type="button" class="group relative aspect-video rounded-2xl overflow-hidden border border-slate-100 shadow-sm cursor-pointer w-full" (click)="openViewer(driver()?.idFrontPhotoUrl)">
                            <img [src]="driver()?.idFrontPhotoUrl" alt="ID Front" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerpolicy="no-referrer">
                            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div class="bg-white text-slate-900 px-3 py-1.5 rounded-xl font-bold text-[10px] flex items-center gap-1">
                                <mat-icon class="text-sm">zoom_in</mat-icon> View Front
                              </div>
                            </div>
                          </button>
                        }
                        @if (driver()?.idBackPhotoUrl) {
                          <button type="button" class="group relative aspect-video rounded-2xl overflow-hidden border border-slate-100 shadow-sm cursor-pointer w-full" (click)="openViewer(driver()?.idBackPhotoUrl)">
                            <img [src]="driver()?.idBackPhotoUrl" alt="ID Back" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerpolicy="no-referrer">
                            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div class="bg-white text-slate-900 px-3 py-1.5 rounded-xl font-bold text-[10px] flex items-center gap-1">
                                <mat-icon class="text-sm">zoom_in</mat-icon> View Back
                              </div>
                            </div>
                          </button>
                        }
                      </div>
                      <div class="p-4 bg-slate-50 rounded-2xl">
                        <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">NIN / ID Number</p>
                        <p class="font-bold text-slate-700">{{ driver()?.nin }} / {{ driver()?.idNumber }}</p>
                      </div>
                    </div>

                    <!-- License Documents -->
                    <div class="space-y-6">
                      <h4 class="text-xs font-black uppercase tracking-widest text-slate-400">Driver License</h4>
                      <div class="grid grid-cols-2 gap-4">
                        @if (driver()?.licenseFrontPhotoUrl) {
                          <button type="button" class="group relative aspect-video rounded-2xl overflow-hidden border border-slate-100 shadow-sm cursor-pointer w-full" (click)="openViewer(driver()?.licenseFrontPhotoUrl)">
                            <img [src]="driver()?.licenseFrontPhotoUrl" alt="License Front" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerpolicy="no-referrer">
                            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div class="bg-white text-slate-900 px-3 py-1.5 rounded-xl font-bold text-[10px] flex items-center gap-1">
                                <mat-icon class="text-sm">zoom_in</mat-icon> View Front
                              </div>
                            </div>
                          </button>
                        }
                        @if (driver()?.licenseBackPhotoUrl) {
                          <button type="button" class="group relative aspect-video rounded-2xl overflow-hidden border border-slate-100 shadow-sm cursor-pointer w-full" (click)="openViewer(driver()?.licenseBackPhotoUrl)">
                            <img [src]="driver()?.licenseBackPhotoUrl" alt="License Back" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerpolicy="no-referrer">
                            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div class="bg-white text-slate-900 px-3 py-1.5 rounded-xl font-bold text-[10px] flex items-center gap-1">
                                <mat-icon class="text-sm">zoom_in</mat-icon> View Back
                              </div>
                            </div>
                          </button>
                        }
                      </div>
                      <div class="p-4 bg-slate-50 rounded-2xl">
                        <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">License Class / Authority</p>
                        <p class="font-bold text-slate-700">{{ driver()?.licenseClass }} / {{ driver()?.licenseIssuingAuthority }}</p>
                      </div>
                    </div>

                    <!-- Vehicle Documents -->
                    <div class="md:col-span-2 space-y-6">
                      <h4 class="text-xs font-black uppercase tracking-widest text-slate-400">Vehicle Documents</h4>
                      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        @if (driver()?.vehicleRegistrationUrl) {
                          <button (click)="openViewer(driver()?.vehicleRegistrationUrl)" class="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center gap-2 hover:bg-slate-100 transition-colors">
                            <mat-icon class="text-primary">description</mat-icon>
                            <span class="text-[10px] font-bold text-slate-600 text-center">Registration</span>
                          </button>
                        }
                        @if (driver()?.proofOfOwnershipUrl) {
                          <button (click)="openViewer(driver()?.proofOfOwnershipUrl)" class="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center gap-2 hover:bg-slate-100 transition-colors">
                            <mat-icon class="text-primary">assignment_ind</mat-icon>
                            <span class="text-[10px] font-bold text-slate-600 text-center">Ownership</span>
                          </button>
                        }
                        @if (driver()?.roadWorthinessUrl) {
                          <button (click)="openViewer(driver()?.roadWorthinessUrl)" class="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center gap-2 hover:bg-slate-100 transition-colors">
                            <mat-icon class="text-primary">verified</mat-icon>
                            <span class="text-[10px] font-bold text-slate-600 text-center">Road Worthy</span>
                          </button>
                        }
                        @if (driver()?.insuranceUrl) {
                          <button (click)="openViewer(driver()?.insuranceUrl)" class="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center gap-2 hover:bg-slate-100 transition-colors">
                            <mat-icon class="text-primary">security</mat-icon>
                            <span class="text-[10px] font-bold text-slate-600 text-center">Insurance</span>
                          </button>
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      </main>

      <!-- Image Viewer Modal -->
      @if (activeViewer()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm" (click)="closeViewer()" (keydown.escape)="closeViewer()" tabindex="0" role="button" aria-label="Close image viewer">
          <button (click)="closeViewer()" class="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all z-20">
            <mat-icon>close</mat-icon>
          </button>
          <div class="relative max-w-5xl max-h-full w-full flex items-center justify-center" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()" tabindex="-1">
            <img [src]="activeViewer()" class="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" referrerpolicy="no-referrer" alt="Document View">
          </div>
        </div>
      }

      <!-- Ban Modal -->
      @if (showBanModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div class="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div class="p-8">
              <div class="w-16 h-16 bg-danger/10 text-danger rounded-2xl flex items-center justify-center mb-6">
                <mat-icon class="text-3xl">block</mat-icon>
              </div>
              <h2 class="text-2xl font-bold text-slate-900 mb-2">Ban Driver</h2>
              <p class="text-slate-500 mb-6 font-medium">Please provide a clear reason for restricting this driver's access for internal records.</p>
              
              <div class="space-y-4">
                <div>
                  <label for="banReason" class="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Violation Description</label>
                  <textarea 
                    id="banReason"
                    #reasonInput
                    class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-slate-700 min-h-[120px] focus:ring-2 focus:ring-danger/20 outline-none transition-all"
                    placeholder="e.g. Safety violations reported by multiple passengers..."></textarea>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4 mt-8">
                <button (click)="showBanModal.set(false)" class="bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all">Cancel</button>
                <button (click)="confirmBan(reasonInput.value)" class="bg-danger text-white py-4 rounded-2xl font-bold shadow-lg shadow-danger/20 hover:bg-danger-dark transition-all">Confirm Ban</button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class AdminDriverDetails implements OnInit {
  route = inject(ActivatedRoute);
  authService = inject(AuthService);
  driver = signal<DriverProfile | null>(null);
  trips = signal<Trip[]>([]);
  loading = signal(true);
  activeViewer = signal<string | null>(null);
  showBanModal = signal(false);

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      await this.loadDriverData(id);
    } else {
      this.loading.set(false);
    }
  }

  async loadDriverData(id: string) {
    this.loading.set(true);
    try {
      const docSnap = await getDoc(doc(getDb(), 'drivers', id));
      if (docSnap.exists()) {
        this.driver.set({ uid: docSnap.id, ...docSnap.data() } as DriverProfile);
        await this.loadTrips(id);
      }
    } catch (error) {
      console.error('Failed to load driver details', error);
    } finally {
      this.loading.set(false);
    }
  }

  async loadTrips(driverId: string) {
    try {
      const q = query(
        collection(getDb(), 'trips'),
        where('driverId', '==', driverId),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      const querySnapshot = await getDocs(q);
      this.trips.set(querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Trip)));
    } catch (error) {
      console.error('Failed to load trips', error);
    }
  }

  async updateStatus(status: 'verified' | 'rejected' | 'banned') {
    const d = this.driver();
    if (!d) return;

    const path = `drivers/${d.uid}`;
    try {
      const updateData: Partial<DriverProfile> = {
        verificationStatus: status
      };
      
      if (status === 'verified') {
        updateData.verifiedAt = new Date().toISOString();
      }

      await updateDoc(doc(getDb(), 'drivers', d.uid), updateData);
      this.driver.set({ ...d, ...updateData } as DriverProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  async toggleBan() {
    this.showBanModal.set(true);
  }

  async confirmBan(reason: string) {
    const d = this.driver();
    if (!d) return;

    try {
      await updateDoc(doc(getDb(), 'drivers', d.uid), {
        verificationStatus: 'banned',
        isBanned: true,
        banReason: reason || 'Violation of safety terms'
      });
      this.driver.set({ 
        ...d, 
        verificationStatus: 'banned', 
        isBanned: true, 
        banReason: reason || 'Violation of safety terms' 
      } as DriverProfile);
      this.showBanModal.set(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `drivers/${d.uid}`);
    }
  }

  async toggleUnban() {
    if (!confirm('Are you sure you want to restore access for this driver?')) return;
    
    const d = this.driver();
    if (!d) return;

    try {
      await updateDoc(doc(getDb(), 'drivers', d.uid), {
        verificationStatus: 'verified',
        isBanned: false
      });
      this.driver.set({ ...d, verificationStatus: 'verified', isBanned: false });
      alert('Driver access restored.');
    } catch (error) {
      console.error('Failed to unban driver', error);
    }
  }

  openViewer(url: string | undefined) {
    if (url) this.activeViewer.set(url);
  }

  closeViewer() {
    this.activeViewer.set(null);
  }
}
