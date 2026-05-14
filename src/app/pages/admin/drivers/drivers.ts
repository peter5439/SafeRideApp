import {Component, signal, inject, effect} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule} from '@angular/common';
import {getDb, handleFirestoreError, OperationType} from '../../../firebase';
import {collection, onSnapshot, doc, updateDoc, query, orderBy, Unsubscribe} from 'firebase/firestore';
import {DriverProfile} from '../../../models/types';
import {AuthService} from '../../../services/auth';

@Component({
  selector: 'app-admin-drivers',
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
            <a routerLink="/admin/dashboard" class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors">
              <mat-icon>arrow_back</mat-icon>
            </a>
            <h1 class="text-xl font-bold text-slate-900">Driver Management</h1>
          </div>
          <div class="flex items-center gap-6">
            <div class="relative">
              <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</mat-icon>
              <input type="text" placeholder="Search drivers..." class="bg-slate-100 border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none w-64">
            </div>
            <div class="h-8 w-px bg-slate-200"></div>
            <button (click)="authService.logout()" class="flex items-center gap-2 text-slate-400 hover:text-danger transition-colors font-bold text-sm">
              <mat-icon class="text-sm">logout</mat-icon> Logout
            </button>
          </div>
        </header>

        <div class="p-8">
          @if (authService.loading()) {
            <div class="flex flex-col items-center justify-center py-20">
              <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p class="text-slate-400 font-bold uppercase tracking-widest">Loading Drivers</p>
            </div>
          } @else if (!authService.isAdmin()) {
            <div class="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
              <mat-icon class="text-6xl text-danger mb-4">lock</mat-icon>
              <h2 class="text-2xl font-bold mb-2">Access Denied</h2>
              <p class="text-slate-500 mb-8">You do not have permission to view this page.</p>
              <a routerLink="/passenger/home" class="bg-primary text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20">
                Return to Home
              </a>
            </div>
          } @else {
            <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-slate-50/50">
                    <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Driver</th>
                    <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Vehicle</th>
                    <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Rating</th>
                    <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Registered</th>
                    <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">
                  @for (driver of drivers(); track driver.uid) {
                     <tr [class]="'hover:bg-slate-50/50 transition-colors ' + (driver.verificationStatus === 'banned' ? 'bg-danger/5' : '')">
                      <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                          <div class="relative">
                            <img [src]="driver.profilePhotoUrl || 'https://picsum.photos/seed/' + driver.uid + '/100/100'" 
                                 class="w-10 h-10 rounded-full object-cover" referrerpolicy="no-referrer" [alt]="driver.displayName">
                            @if (driver.verificationStatus === 'banned') {
                              <div class="absolute -bottom-1 -right-1 bg-danger text-white rounded-full w-4 h-4 flex items-center justify-center border-2 border-white">
                                <mat-icon class="text-[10px]">block</mat-icon>
                              </div>
                            }
                          </div>
                          <div>
                            <p class="text-sm font-bold text-slate-900">{{ driver.displayName }}</p>
                            <p class="text-xs text-slate-500">{{ driver.email }}</p>
                          </div>
                        </div>
                      </td>
                      <td class="px-6 py-4">
                        <p class="text-sm font-bold text-slate-700">{{ driver.plateNumber || 'N/A' }}</p>
                        <p class="text-xs text-slate-500">{{ driver.model || 'N/A' }}</p>
                      </td>
                      <td class="px-6 py-4">
                        <div class="flex flex-col">
                          <div class="flex items-center gap-1">
                            <span class="text-sm font-bold text-slate-700">{{ (driver.rating || 0).toFixed(1) }}</span>
                            <mat-icon class="text-amber-400 text-xs">star</mat-icon>
                          </div>
                          <span [class]="'text-[10px] font-bold ' + ((driver.reportCount || 0) > 0 ? 'text-danger' : 'text-slate-400')">
                            {{ driver.reportCount || 0 }} Reports
                          </span>
                        </div>
                      </td>
                      <td class="px-6 py-4">
                        <span [class]="'text-[10px] font-black uppercase px-2 py-1 rounded-md ' + 
                          (driver.verificationStatus === 'verified' ? 'bg-green-100 text-green-700' : 
                           driver.verificationStatus === 'pending' ? 'bg-amber-100 text-amber-700' : 
                           driver.verificationStatus === 'banned' ? 'bg-danger text-white' : 'bg-danger/10 text-danger')">
                          {{ driver.verificationStatus }}
                        </span>
                      </td>
                      <td class="px-6 py-4 text-xs text-slate-400">{{ driver.createdAt | date:'mediumDate' }}</td>
                      <td class="px-6 py-4">
                        <div class="flex items-center gap-2">
                          @if (driver.verificationStatus === 'pending') {
                            <button (click)="verifyDriver(driver.uid, 'verified')" class="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all" title="Approve">
                              <mat-icon class="text-sm">check</mat-icon>
                            </button>
                            <button (click)="verifyDriver(driver.uid, 'rejected')" class="p-2 bg-danger/5 text-danger rounded-lg hover:bg-danger hover:text-white transition-all" title="Reject">
                              <mat-icon class="text-sm">close</mat-icon>
                            </button>
                          } @else if (driver.verificationStatus === 'verified') {
                            <button (click)="toggleBan(driver)" class="p-2 bg-danger/5 text-danger rounded-lg hover:bg-danger hover:text-white transition-all" title="Ban Driver">
                              <mat-icon class="text-sm">block</mat-icon>
                            </button>
                          } @else if (driver.verificationStatus === 'banned') {
                            <button (click)="toggleUnban(driver)" class="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all" title="Unban Driver">
                              <mat-icon class="text-sm">check_circle</mat-icon>
                            </button>
                          }
                          <button [routerLink]="['/admin/drivers', driver.uid]" class="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all" title="View Details">
                            <mat-icon class="text-sm">visibility</mat-icon>
                          </button>
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5" class="px-6 py-12 text-center text-slate-400 italic">No drivers found.</td>
                    </tr>
                  }
                </tbody>
              </table>
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
export class AdminDrivers {
  authService = inject(AuthService);
  drivers = signal<DriverProfile[]>([]);
  private unsubscribe: Unsubscribe | null = null;

  constructor() {
    effect(() => {
      if (this.authService.isAdmin()) {
        this.setupSubscription();
      } else {
        this.cleanupSubscription();
      }
    });
  }

  private setupSubscription() {
    this.cleanupSubscription();
    const path = 'drivers';
    const q = query(collection(getDb(), path), orderBy('createdAt', 'desc'));
    this.unsubscribe = onSnapshot(q, (snapshot) => {
      this.drivers.set(snapshot.docs.map(docSnap => ({ uid: docSnap.id, ...docSnap.data() } as DriverProfile)));
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

  async verifyDriver(uid: string, status: 'verified' | 'rejected') {
    const path = `drivers/${uid}`;
    try {
      const updateData: Partial<DriverProfile> = { verificationStatus: status };
      if (status === 'verified') {
        updateData.verifiedAt = new Date().toISOString();
      }
      await updateDoc(doc(getDb(), 'drivers', uid), updateData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  async toggleBan(driver: DriverProfile) {
    const reason = prompt(`Enter reason for banning ${driver.displayName}:`);
    if (reason === null) return;

    const path = `drivers/${driver.uid}`;
    try {
      await updateDoc(doc(getDb(), 'drivers', driver.uid), {
        verificationStatus: 'banned',
        isBanned: true,
        banReason: reason || 'Violation of terms'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  async toggleUnban(driver: DriverProfile) {
    if (!confirm(`Restore access for ${driver.displayName}?`)) return;

    const path = `drivers/${driver.uid}`;
    try {
      await updateDoc(doc(getDb(), 'drivers', driver.uid), {
        verificationStatus: 'verified',
        isBanned: false,
        banReason: null
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
}
