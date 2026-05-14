import {Component, signal, inject, effect} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule} from '@angular/common';
import {getDb, handleFirestoreError, OperationType} from '../../../firebase';
import {collection, query, getDocs, onSnapshot, orderBy, limit, where, Unsubscribe} from 'firebase/firestore';
import {DriverProfile, Incident} from '../../../models/types';
import {AuthService} from '../../../services/auth';

@Component({
  selector: 'app-admin-dashboard',
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
          <a routerLink="/admin/dashboard" class="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary text-white font-bold">
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

      <!-- Main Content -->
      <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <!-- Top Bar -->
        <header class="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <h1 class="text-xl font-bold text-slate-900">Dashboard Overview</h1>
          <div class="flex items-center gap-6">
            <div class="flex items-center gap-4">
              <button class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 relative">
                <mat-icon>notifications</mat-icon>
                <span class="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full border-2 border-white"></span>
              </button>
              <div class="flex items-center gap-3">
                <div class="text-right hidden sm:block">
                  <p class="text-sm font-bold text-slate-900">{{ authService.profile()?.displayName || 'Admin' }}</p>
                  <p class="text-xs text-slate-500">Super Admin</p>
                </div>
                <img src="https://picsum.photos/seed/admin/100/100" class="w-10 h-10 rounded-full object-cover" referrerpolicy="no-referrer" alt="Admin Profile">
              </div>
            </div>
            <div class="h-8 w-px bg-slate-200"></div>
            <button (click)="authService.logout()" class="flex items-center gap-2 text-slate-400 hover:text-danger transition-colors font-bold text-sm">
              <mat-icon class="text-sm">logout</mat-icon> Logout
            </button>
          </div>
        </header>

        <!-- Content Area -->
        <div class="flex-1 overflow-y-auto p-8">
          @if (authService.loading()) {
            <div class="flex flex-col items-center justify-center py-20">
              <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p class="text-slate-400 font-bold uppercase tracking-widest">Loading Dashboard</p>
            </div>
          } @else if (!authService.isAdmin()) {
            <div class="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
              <mat-icon class="text-6xl text-danger mb-4">lock</mat-icon>
              <h2 class="text-2xl font-bold mb-2">Access Denied</h2>
              <p class="text-slate-500 mb-8">You do not have permission to view the admin dashboard.</p>
              <a routerLink="/passenger/home" class="bg-primary text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20">
                Return to Home
              </a>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <div class="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                <div class="flex items-center justify-between mb-3">
                  <div class="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <mat-icon class="text-sm">directions_car</mat-icon>
                  </div>
                </div>
                <p class="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Total Drivers</p>
                <h3 class="text-2xl font-bold text-slate-900">{{ stats().totalDrivers }}</h3>
              </div>

              <div class="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                <div class="flex items-center justify-between mb-3">
                  <div class="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                    <mat-icon class="text-sm">verified</mat-icon>
                  </div>
                </div>
                <p class="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Verified Drivers</p>
                <h3 class="text-2xl font-bold text-slate-900">{{ stats().verifiedDrivers }}</h3>
              </div>

              <div class="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                <div class="flex items-center justify-between mb-3">
                  <div class="w-10 h-10 bg-danger/10 rounded-2xl flex items-center justify-center text-danger">
                    <mat-icon class="text-sm">block</mat-icon>
                  </div>
                  @if (stats().bannedDrivers > 0) {
                    <span class="text-[8px] font-bold text-danger bg-danger/5 px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <mat-icon class="text-[10px]">warning</mat-icon> Restricted
                    </span>
                  }
                </div>
                <p class="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Banned Drivers</p>
                <h3 class="text-2xl font-bold text-slate-900">{{ stats().bannedDrivers }}</h3>
              </div>

              <div class="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                <div class="flex items-center justify-between mb-3">
                  <div class="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600">
                    <mat-icon class="text-sm">people</mat-icon>
                  </div>
                </div>
                <p class="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Passengers</p>
                <h3 class="text-2xl font-bold text-slate-900">{{ stats().totalPassengers }}</h3>
              </div>

              <div class="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                <div class="flex items-center justify-between mb-3">
                  <div class="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                    <mat-icon class="text-sm">report_problem</mat-icon>
                  </div>
                </div>
                <p class="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Incidents</p>
                <h3 class="text-2xl font-bold text-slate-900">{{ stats().openIncidents }}</h3>
              </div>

              <div class="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                <div class="flex items-center justify-between mb-3">
                  <div class="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                    <mat-icon class="text-sm">inventory_2</mat-icon>
                  </div>
                </div>
                <p class="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Lost Items</p>
                <h3 class="text-2xl font-bold text-slate-900">{{ stats().lostItems }}</h3>
              </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <!-- Recent Incidents -->
              <div class="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div class="p-6 border-b border-slate-50 flex items-center justify-between">
                  <h3 class="font-bold text-slate-900">Recent Incidents</h3>
                  <a routerLink="/admin/incidents" class="text-sm font-bold text-primary hover:underline">View All</a>
                </div>
                <div class="overflow-x-auto">
                  <table class="w-full text-left border-collapse">
                    <thead>
                      <tr class="bg-slate-50/50">
                        <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Reporter</th>
                        <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Description</th>
                        <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Severity</th>
                        <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                        <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Time</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
                      @for (incident of recentIncidents(); track incident.id) {
                        <tr class="hover:bg-slate-50/50 transition-colors">
                          <td class="px-6 py-4">
                            <div class="flex items-center gap-3">
                              <div class="w-8 h-8 bg-slate-100 rounded-full"></div>
                              <span class="text-sm font-bold text-slate-700">{{ incident.reporterId.substring(0, 8) }}...</span>
                            </div>
                          </td>
                          <td class="px-6 py-4 text-sm text-slate-600">{{ incident.description }}</td>
                          <td class="px-6 py-4">
                            <span [class]="'text-[10px] font-black uppercase px-2 py-1 rounded-md ' + 
                              (incident.severity === 'high' ? 'bg-danger/10 text-danger' : 
                               incident.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700')">
                              {{ incident.severity }}
                            </span>
                          </td>
                          <td class="px-6 py-4">
                            <span class="text-xs font-bold text-slate-500 flex items-center gap-1">
                              <mat-icon class="text-sm">schedule</mat-icon> {{ incident.status }}
                            </span>
                          </td>
                          <td class="px-6 py-4 text-xs text-slate-400">{{ incident.timestamp | date:'shortTime' }}</td>
                        </tr>
                      } @empty {
                        <tr>
                          <td colspan="5" class="px-6 py-12 text-center text-slate-400 italic">No recent incidents reported.</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Pending Verifications -->
              <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div class="p-6 border-b border-slate-50">
                  <h3 class="font-bold text-slate-900">Pending Verifications</h3>
                </div>
                <div class="p-6 space-y-6">
                  @for (driver of pendingDrivers(); track driver.uid) {
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <img [src]="driver.profilePhotoUrl || 'https://picsum.photos/seed/' + driver.uid + '/100/100'" 
                             class="w-10 h-10 rounded-full object-cover" referrerpolicy="no-referrer" [alt]="driver.displayName">
                        <div>
                          <p class="text-sm font-bold text-slate-900">{{ driver.displayName }}</p>
                          <p class="text-xs text-slate-500">{{ driver.licenseNumber }}</p>
                        </div>
                      </div>
                      <a [routerLink]="['/admin/drivers', driver.uid]" class="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 hover:bg-primary hover:text-white transition-all">
                        <mat-icon class="text-sm">chevron_right</mat-icon>
                      </a>
                    </div>
                  } @empty {
                    <div class="text-center py-8">
                      <mat-icon class="text-slate-200 text-4xl mb-2">check_circle</mat-icon>
                      <p class="text-sm text-slate-400 italic">All caught up!</p>
                    </div>
                  }
                </div>
                <div class="p-6 bg-slate-50/50 border-t border-slate-50">
                  <a routerLink="/admin/drivers" class="w-full bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors">
                    View All Drivers
                  </a>
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
export class AdminDashboard {
  authService = inject(AuthService);
  router = inject(Router);
  stats = signal({
    totalDrivers: 0,
    verifiedDrivers: 0,
    bannedDrivers: 0,
    totalPassengers: 0,
    openIncidents: 0,
    lostItems: 0
  });
  recentIncidents = signal<Incident[]>([]);
  pendingDrivers = signal<DriverProfile[]>([]);
  private unsubscribes: Unsubscribe[] = [];

  constructor() {
    effect(() => {
      if (this.authService.isAdmin()) {
        this.setupSubscriptions();
        this.loadStats();
      } else {
        this.cleanupSubscriptions();
      }
    });
  }

  private setupSubscriptions() {
    this.cleanupSubscriptions();
    this.loadRecentIncidents();
    this.loadPendingDrivers();
  }

  private cleanupSubscriptions() {
    this.unsubscribes.forEach(unsub => unsub());
    this.unsubscribes = [];
  }

  async loadStats() {
    if (!this.authService.isAdmin()) return;
    try {
      const driversSnap = await getDocs(collection(getDb(), 'drivers'));
      const passengersSnap = await getDocs(collection(getDb(), 'passengers'));
      const incidentsSnap = await getDocs(collection(getDb(), 'incidents'));
      const lostItemsSnap = await getDocs(collection(getDb(), 'lost_items'));

      const drivers = driversSnap.docs.map(d => d.data() as DriverProfile);
      
      this.stats.set({
        totalDrivers: drivers.length,
        verifiedDrivers: drivers.filter(d => d.verificationStatus === 'verified').length,
        bannedDrivers: drivers.filter(d => d.verificationStatus === 'banned').length,
        totalPassengers: passengersSnap.size,
        openIncidents: incidentsSnap.docs.filter(i => (i.data() as { status: string })['status'] === 'open').length,
        lostItems: lostItemsSnap.size
      });
    } catch (error) {
      console.error('Failed to load stats', error);
    }
  }

  loadRecentIncidents() {
    const path = 'incidents';
    const q = query(collection(getDb(), path), orderBy('timestamp', 'desc'), limit(5));
    const unsub = onSnapshot(q, (snapshot) => {
      this.recentIncidents.set(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Incident)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    this.unsubscribes.push(unsub);
  }

  loadPendingDrivers() {
    const path = 'drivers';
    const q = query(collection(getDb(), path), where('verificationStatus', '==', 'pending'), limit(5));
    const unsub = onSnapshot(q, (snapshot) => {
      this.pendingDrivers.set(snapshot.docs.map(docSnap => ({ uid: docSnap.id, ...docSnap.data() } as DriverProfile)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    this.unsubscribes.push(unsub);
  }
}
