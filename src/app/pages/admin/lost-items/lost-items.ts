import {Component, inject, signal, OnInit, OnDestroy} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule} from '@angular/common';
import {AuthService} from '../../../services/auth';
import {getDb} from '../../../firebase';
import {collection, query, orderBy, onSnapshot, Unsubscribe, doc, updateDoc, getDoc} from 'firebase/firestore';
import {LostItem, UserProfile, DriverProfile} from '../../../models/types';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-admin-lost-items',
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
          <a routerLink="/admin/passengers" class="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all">
            <mat-icon>people</mat-icon> Passengers
          </a>
          <a routerLink="/admin/lost-items" class="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary text-white font-bold">
            <mat-icon>inventory_2</mat-icon> Lost Items
          </a>
        </nav>

        <div class="p-6 mt-auto border-t border-white/5">
          <button (click)="authService.logout()" class="flex items-center gap-3 text-slate-400 hover:text-white transition-colors">
            <mat-icon>logout</mat-icon> Logout
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header class="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <h1 class="text-xl font-bold text-slate-900">Lost Items Repo</h1>
          <div class="flex items-center gap-4">
             <div class="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full">
                <div class="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <span class="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Live Updates</span>
             </div>
          </div>
        </header>

        <div class="flex-1 overflow-y-auto p-8">
          <div class="max-w-6xl mx-auto">
            <!-- Stats -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Reported</p>
                <p class="text-3xl font-bold text-slate-900">{{ lostItems().length }}</p>
              </div>
              <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Items Found</p>
                <p class="text-3xl font-bold text-amber-600">{{ getCountByStatus('found') }}</p>
              </div>
              <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Items Returned</p>
                <p class="text-3xl font-bold text-green-600">{{ getCountByStatus('returned') }}</p>
              </div>
            </div>

            <!-- Lost Items List -->
            <div class="space-y-4">
              @for (item of lostItems(); track item.id) {
                <div class="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 hover:border-primary/20 transition-all">
                  <div class="p-6 md:p-8 flex flex-col md:flex-row gap-8">
                    <!-- Status & Basic Info -->
                    <div class="md:w-64 space-y-4">
                      <div [class]="'inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ' + getStatusClass(item.status)">
                        <div [class]="'w-1.5 h-1.5 rounded-full ' + getStatusDotClass(item.status)"></div>
                        {{ item.status }}
                      </div>
                      <div>
                        <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 font-mono">Reported At</p>
                        <p class="text-sm font-bold text-slate-700">{{ item.timestamp | date:'medium' }}</p>
                      </div>
                      <div>
                        <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 font-mono">Item ID</p>
                        <p class="text-[10px] font-mono text-slate-400 truncate">{{ item.id }}</p>
                      </div>
                    </div>

                    <!-- Details -->
                    <div class="flex-1 space-y-6">
                      <div>
                        <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Item Description</p>
                        <p class="text-slate-800 text-lg font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 italic">
                          "{{ item.description }}"
                        </p>
                      </div>

                      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- Passenger Info -->
                        <div class="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                           <div class="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                             <mat-icon>person</mat-icon>
                           </div>
                           <div>
                             <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Passenger</p>
                             <a [routerLink]="['/admin/passengers', item.passengerId]" class="text-sm font-bold text-slate-900 hover:text-primary transition-colors">
                               {{ item.passengerName || 'SafeRide Passenger' }}
                             </a>
                           </div>
                        </div>

                        <!-- Driver Info -->
                        <div class="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                           <div class="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                             <mat-icon>directions_car</mat-icon>
                           </div>
                           <div>
                             <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Driver</p>
                             <a [routerLink]="['/admin/drivers', item.driverId]" class="text-sm font-bold text-slate-900 hover:text-amber-600 transition-colors">
                               {{ item.driverName || 'SafeRide Driver' }}
                             </a>
                           </div>
                        </div>
                      </div>
                      
                      @if (item.tripId) {
                        <div class="flex items-center gap-2">
                           <mat-icon class="text-slate-300 text-sm">link</mat-icon>
                           <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Trip ID: {{ item.tripId }}</span>
                        </div>
                      }
                    </div>

                    <!-- Actions -->
                    <div class="md:w-48 flex md:flex-col gap-2 justify-center">
                       @if (item.status === 'reported') {
                         <button (click)="updateStatus(item.id, 'found')" class="flex-1 bg-amber-500 text-white py-3 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-95 transition-all">
                           Mark Found
                         </button>
                       } @else if (item.status === 'found') {
                         <button (click)="updateStatus(item.id, 'returned')" class="flex-1 bg-green-600 text-white py-3 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-green-600/20 active:scale-95 transition-all">
                           Mark Returned
                         </button>
                       }
                       @if (item.status !== 'returned') {
                         <button (click)="toggleContact(item)" class="flex-1 bg-white border border-slate-200 text-slate-600 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                           <mat-icon class="text-sm">contact_phone</mat-icon>
                           Contact
                         </button>
                       }
                    </div>
                  </div>

                  <!-- Contact Details Expansion -->
                  @if (expandedContact() === item.id) {
                    <div class="px-8 pb-8 animate-in fade-in slide-in-from-top-4 duration-300">
                      <div class="pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- Passenger Contact -->
                        <div class="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                          <h4 class="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Passenger Contact</h4>
                          @if (loadingContact()) {
                            <div class="animate-pulse flex space-x-4">
                              <div class="flex-1 space-y-2 py-1">
                                <div class="h-2 bg-primary/20 rounded"></div>
                                <div class="h-2 bg-primary/20 rounded w-5/6"></div>
                              </div>
                            </div>
                          } @else {
                            <div class="space-y-3">
                              <div class="flex items-center gap-3">
                                <mat-icon class="text-primary text-sm">email</mat-icon>
                                <span class="text-sm font-medium text-slate-700">{{ contactDetails()[item.id]?.passenger?.email || 'N/A' }}</span>
                              </div>
                              <div class="flex items-center gap-3">
                                <mat-icon class="text-primary text-sm">phone</mat-icon>
                                <span class="text-sm font-medium text-slate-700">{{ contactDetails()[item.id]?.passenger?.phoneNumber || 'N/A' }}</span>
                              </div>
                            </div>
                          }
                        </div>

                        <!-- Driver Contact -->
                        <div class="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                          <h4 class="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-3">Driver Contact</h4>
                          @if (loadingContact()) {
                            <div class="animate-pulse flex space-x-4">
                              <div class="flex-1 space-y-2 py-1">
                                <div class="h-2 bg-amber-200 rounded"></div>
                                <div class="h-2 bg-amber-200 rounded w-5/6"></div>
                              </div>
                            </div>
                          } @else {
                            <div class="space-y-3">
                              <div class="flex items-center gap-3">
                                <mat-icon class="text-amber-600 text-sm">email</mat-icon>
                                <span class="text-sm font-medium text-slate-700">{{ contactDetails()[item.id]?.driver?.email || 'N/A' }}</span>
                              </div>
                              <div class="flex items-center gap-3">
                                <mat-icon class="text-amber-600 text-sm">phone</mat-icon>
                                <span class="text-sm font-medium text-slate-700">{{ contactDetails()[item.id]?.driver?.phoneNumber || 'N/A' }}</span>
                              </div>
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                  }
                </div>
              } @empty {
                <div class="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
                  <mat-icon class="text-6xl text-slate-200 mb-4">inventory_2</mat-icon>
                  <h2 class="text-2xl font-bold text-slate-900 mb-2">No Lost Items Reported</h2>
                  <p class="text-slate-500">Items reported by passengers or drivers will appear here.</p>
                </div>
              }
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class AdminLostItems implements OnInit, OnDestroy {
  authService = inject(AuthService);
  lostItems = signal<LostItem[]>([]);
  expandedContact = signal<string | null>(null);
  contactDetails = signal<Record<string, { passenger?: UserProfile, driver?: DriverProfile }>>({});
  loadingContact = signal(false);
  private unsubscribe: Unsubscribe | null = null;

  ngOnInit() {
    this.loadLostItems();
  }

  ngOnDestroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  loadLostItems() {
    const q = query(
      collection(getDb(), 'lost_items'),
      orderBy('timestamp', 'desc')
    );

    this.unsubscribe = onSnapshot(q, (snapshot) => {
      this.lostItems.set(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as LostItem)));
    });
  }

  getCountByStatus(status: string) {
    return this.lostItems().filter(item => item.status === status).length;
  }

  getStatusClass(status: string) {
    switch (status) {
      case 'returned': return 'bg-green-100 text-green-700';
      case 'found': return 'bg-amber-100 text-amber-700';
      default: return 'bg-primary/10 text-primary';
    }
  }

  getStatusDotClass(status: string) {
    switch (status) {
      case 'returned': return 'bg-green-600';
      case 'found': return 'bg-amber-600';
      default: return 'bg-primary';
    }
  }

  async updateStatus(id: string, status: 'found' | 'returned') {
    try {
      await updateDoc(doc(getDb(), 'lost_items', id), { status });
    } catch (error) {
      console.error('Failed to update status', error);
      alert('Failed to update status');
    }
  }

  async toggleContact(item: LostItem) {
    if (this.expandedContact() === item.id) {
      this.expandedContact.set(null);
      return;
    }

    this.expandedContact.set(item.id);

    // Fetch details if not already loaded
    if (!this.contactDetails()[item.id]) {
      this.loadingContact.set(true);
      try {
        const [passengerSnap, driverSnap] = await Promise.all([
          getDoc(doc(getDb(), 'passengers', item.passengerId)),
          getDoc(doc(getDb(), 'drivers', item.driverId))
        ]);

        const passenger = passengerSnap.exists() ? passengerSnap.data() as UserProfile : undefined;
        const driver = driverSnap.exists() ? driverSnap.data() as DriverProfile : undefined;

        this.contactDetails.update(prev => ({
          ...prev,
          [item.id]: { passenger, driver }
        }));
      } catch (error) {
        console.error('Failed to load contact details', error);
      } finally {
        this.loadingContact.set(false);
      }
    }
  }
}
