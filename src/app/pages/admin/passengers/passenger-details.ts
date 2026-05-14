import {Component, signal, inject, OnInit} from '@angular/core';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {getDb} from '../../../firebase';
import {doc, getDoc, collection, query, where, getDocs, orderBy, limit, updateDoc} from 'firebase/firestore';
import {UserProfile, Trip, EmergencyContact} from '../../../models/types';
import {AuthService} from '../../../services/auth';

@Component({
  selector: 'app-admin-passenger-details',
  imports: [RouterLink, MatIconModule, CommonModule, FormsModule],
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
          <a routerLink="/admin/drivers" class="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all">
            <mat-icon>directions_car</mat-icon> Drivers
          </a>
          <a routerLink="/admin/incidents" class="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all">
            <mat-icon>report_problem</mat-icon> Incidents
          </a>
          <a routerLink="/admin/passengers" class="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary text-white font-bold">
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
            <a routerLink="/admin/passengers" class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors">
              <mat-icon>arrow_back</mat-icon>
            </a>
            <h1 class="text-xl font-bold text-slate-900">Passenger Details</h1>
          </div>
        </header>

        <div class="p-8 overflow-y-auto">
          @if (loading()) {
            <div class="flex flex-col items-center justify-center py-20">
              <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p class="text-slate-400 font-bold uppercase tracking-widest">Loading Details</p>
            </div>
          } @else if (!passenger()) {
            <div class="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
              <mat-icon class="text-6xl text-slate-200 mb-4">person_off</mat-icon>
              <h2 class="text-2xl font-bold mb-2">Passenger Not Found</h2>
              <p class="text-slate-500 mb-8">The passenger you are looking for does not exist or has been removed.</p>
              <a routerLink="/admin/passengers" class="bg-primary text-white px-8 py-3 rounded-2xl font-bold">
                Back to Passengers
              </a>
            </div>
          } @else {
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <!-- Profile Info -->
              <div class="lg:col-span-1 space-y-8">
                <div class="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
                  <div class="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-3xl mb-6 overflow-hidden">
                    @if (passenger()?.profileImageUrl) {
                      <img [src]="passenger()?.profileImageUrl" class="w-full h-full object-cover" alt="Profile">
                    } @else {
                      {{ passenger()?.displayName?.charAt(0) }}
                    }
                  </div>
                  <h2 class="text-2xl font-bold text-slate-900">{{ passenger()?.displayName }}</h2>
                  <p class="text-slate-500 mb-6">{{ passenger()?.email }}</p>
                  
                  <div [class]="'px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest mb-6 ' + getStatusClass()">
                    {{ (passenger()?.verificationStatus || 'unverified') }}
                  </div>

                  <div class="w-full pt-6 border-t border-slate-50 space-y-4 text-left">
                    <div>
                      <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Phone Number</p>
                      <p class="text-sm font-bold text-slate-700">{{ passenger()?.phoneNumber || 'Not Provided' }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">National ID (NIN)</p>
                      <p class="text-sm font-bold text-slate-700">{{ passenger()?.nationalId || 'Not Provided' }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Passenger ID</p>
                      <p class="font-mono text-xs font-bold text-slate-700 truncate">{{ passenger()?.uid }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Joined Since</p>
                      <p class="text-sm font-bold text-slate-700">{{ passenger()?.createdAt | date:'longDate' }}</p>
                    </div>
                  </div>
                </div>

                <!-- Verification Management -->
                @if (passenger()?.verificationStatus === 'pending') {
                  <div class="bg-white p-8 rounded-3xl shadow-sm border border-amber-200">
                    <h3 class="font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <mat-icon class="text-amber-500">verified_user</mat-icon> Verification Action
                    </h3>
                    
                    <div class="space-y-4">
                      <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <label for="rejection-reason" class="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Rejection Reason (If Rejecting)</label>
                        <textarea id="rejection-reason" [(ngModel)]="rejectionReason" class="w-full bg-transparent outline-none text-sm min-h-[80px]" placeholder="Explain why identity was rejected..."></textarea>
                      </div>

                      <div class="flex gap-4">
                         <button (click)="updateStatus('verified')" [disabled]="actionLoading()" class="flex-1 bg-green-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-green-100 disabled:opacity-50">
                           Approve
                         </button>
                         <button (click)="updateStatus('rejected')" [disabled]="actionLoading() || !rejectionReason" class="flex-1 bg-danger text-white py-4 rounded-2xl font-bold shadow-lg shadow-danger/10 disabled:opacity-50">
                           Reject
                         </button>
                      </div>
                    </div>
                  </div>
                }

                <div class="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                  <h3 class="font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <mat-icon class="text-primary">contacts</mat-icon> Emergency Contacts
                  </h3>
                  <div class="space-y-4">
                    @for (contact of contacts(); track contact.id) {
                      <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 italic">
                        <p class="text-sm font-bold text-slate-700">{{ contact.name }}</p>
                        <p class="text-xs text-slate-500">{{ contact.phoneNumber }}</p>
                        <p class="text-xs text-primary">{{ contact.email }}</p>
                      </div>
                    } @empty {
                      <p class="text-sm text-slate-400 italic">No emergency contacts set.</p>
                    }
                  </div>
                </div>
              </div>

              <!-- Activity & History -->
              <div class="lg:col-span-2 space-y-8">
                <!-- Identity Documents -->
                @if (passenger()?.idFrontImageUrl) {
                  <div class="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                    <h3 class="font-bold text-slate-900 mb-6">Identity Documents</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 font-mono">Front Side</p>
                        <div class="bg-slate-50 p-2 rounded-2xl border border-slate-200">
                          <img [src]="passenger()?.idFrontImageUrl" class="w-full h-auto rounded-xl shadow-sm" alt="ID Front">
                        </div>
                      </div>
                      @if (passenger()?.idBackImageUrl) {
                        <div>
                          <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 font-mono">Back Side</p>
                          <div class="bg-slate-50 p-2 rounded-2xl border border-slate-200">
                            <img [src]="passenger()?.idBackImageUrl" class="w-full h-auto rounded-xl shadow-sm" alt="ID Back">
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                }

                <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                  <div class="p-6 border-b border-slate-50 flex items-center justify-between">
                    <h3 class="font-bold text-slate-900">Recent Trip History</h3>
                    <span class="text-xs font-bold text-slate-400">{{ trips().length }} Total Trips</span>
                  </div>
                  <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                      <thead>
                        <tr class="bg-slate-50/50">
                          <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Driver</th>
                          <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Time</th>
                          <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-50">
                        @for (trip of trips(); track trip.id) {
                          <tr class="hover:bg-slate-50/50 transition-colors">
                            <td class="px-6 py-4">
                              <div class="flex items-center gap-3">
                                <div class="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                                  <mat-icon class="text-sm">directions_car</mat-icon>
                                </div>
                                <span class="text-sm font-bold text-slate-700">{{ trip.driverName || 'SafeRide Driver' }}</span>
                              </div>
                            </td>
                            <td class="px-6 py-4 text-sm text-slate-600">{{ trip.timestamp | date:'medium' }}</td>
                            <td class="px-6 py-4 text-xs">
                              <span [class]="'px-2 py-1 rounded-full font-bold uppercase ' + (trip.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary')">
                                {{ trip.status }}
                              </span>
                            </td>
                          </tr>
                        } @empty {
                          <tr>
                            <td colspan="3" class="px-6 py-12 text-center text-slate-400 italic">No trip history found for this passenger.</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class AdminPassengerDetails implements OnInit {
  route = inject(ActivatedRoute);
  authService = inject(AuthService);
  passenger = signal<UserProfile | null>(null);
  trips = signal<Trip[]>([]);
  contacts = signal<EmergencyContact[]>([]);
  loading = signal(true);
  actionLoading = signal(false);
  rejectionReason = '';

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      await this.loadPassengerData(id);
    } else {
      this.loading.set(false);
    }
  }

  async loadPassengerData(id: string) {
    this.loading.set(true);
    try {
      const docSnap = await getDoc(doc(getDb(), 'passengers', id));
      if (docSnap.exists()) {
        this.passenger.set({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
        await Promise.all([
          this.loadTrips(id),
          this.loadContacts(id)
        ]);
      }
    } catch (error) {
      console.error('Failed to load passenger details', error);
    } finally {
      this.loading.set(false);
    }
  }

  async loadTrips(passengerId: string) {
    try {
      const q = query(
        collection(getDb(), 'trips'),
        where('passengerId', '==', passengerId),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      const querySnapshot = await getDocs(q);
      this.trips.set(querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Trip)));
    } catch (error) {
      console.error('Failed to load trips', error);
    }
  }

  async loadContacts(passengerId: string) {
    try {
      const q = query(
        collection(getDb(), 'emergency_contacts'),
        where('userId', '==', passengerId)
      );
      const snapshot = await getDocs(q);
      this.contacts.set(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EmergencyContact)));
    } catch (error) {
      console.error('Failed to load emergency contacts', error);
    }
  }

  getStatusClass() {
    const status = this.passenger()?.verificationStatus || 'unverified';
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'rejected': return 'bg-danger/10 text-danger';
      default: return 'bg-slate-100 text-slate-700';
    }
  }

  async updateStatus(status: 'verified' | 'rejected') {
    const p = this.passenger();
    if (!p) return;

    this.actionLoading.set(true);
    try {
      const updateData: Partial<UserProfile> & { updatedAt: string } = {
        verificationStatus: status,
        updatedAt: new Date().toISOString()
      };
      
      if (status === 'verified') {
        updateData.verifiedAt = new Date().toISOString();
        updateData.rejectionReason = '';
      } else {
        updateData.rejectionReason = this.rejectionReason;
      }

      await updateDoc(doc(getDb(), 'passengers', p.uid), updateData as Record<string, unknown>);
      
      // Update local state
      this.passenger.update(val => val ? { ...val, ...updateData } : null);
      this.rejectionReason = '';
      alert(`Passenger verification ${status === 'verified' ? 'approved' : 'rejected'}`);
    } catch (error) {
      console.error('Failed to update status', error);
      alert('Failed to update status');
    } finally {
      this.actionLoading.set(false);
    }
  }
}
