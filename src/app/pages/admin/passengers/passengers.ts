import {Component, signal, inject, effect} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule} from '@angular/common';
import {getDb, handleFirestoreError, OperationType} from '../../../firebase';
import {collection, onSnapshot, query, orderBy, Unsubscribe} from 'firebase/firestore';
import {UserProfile} from '../../../models/types';
import {AuthService} from '../../../services/auth';

@Component({
  selector: 'app-admin-passengers',
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
            <a routerLink="/admin/dashboard" class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors">
              <mat-icon>arrow_back</mat-icon>
            </a>
            <h1 class="text-xl font-bold text-slate-900">Passenger Management</h1>
          </div>
          <button (click)="authService.logout()" class="flex items-center gap-2 text-slate-400 hover:text-danger transition-colors font-bold text-sm">
            <mat-icon class="text-sm">logout</mat-icon> Logout
          </button>
        </header>

        <div class="p-8">
          @if (authService.loading()) {
            <div class="flex flex-col items-center justify-center py-20">
              <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p class="text-slate-400 font-bold uppercase tracking-widest">Loading Passengers</p>
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
                    <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Passenger</th>
                    <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Email</th>
                    <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Joined</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">
                  @for (passenger of passengers(); track passenger.uid) {
                    <tr [routerLink]="['/admin/passengers', passenger.uid]" class="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                      <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                          <div class="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold group-hover:bg-primary group-hover:text-white transition-colors overflow-hidden">
                            @if (passenger.profileImageUrl) {
                              <img [src]="passenger.profileImageUrl" class="w-full h-full object-cover" alt="Profile">
                            } @else {
                              {{ passenger.displayName.charAt(0) }}
                            }
                          </div>
                          <p class="text-sm font-bold text-slate-900">{{ passenger.displayName }}</p>
                        </div>
                      </td>
                      <td class="px-6 py-4 text-sm text-slate-600">{{ passenger.email }}</td>
                      <td class="px-6 py-4">
                        <span [class]="'px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ' + getStatusClass(passenger.verificationStatus)">
                          {{ passenger.verificationStatus || 'unverified' }}
                        </span>
                      </td>
                      <td class="px-6 py-4">
                        <div class="flex items-center justify-between">
                          <span class="text-xs text-slate-400">{{ passenger.createdAt | date:'mediumDate' }}</span>
                          <mat-icon class="text-slate-200 group-hover:text-primary transition-colors">chevron_right</mat-icon>
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="3" class="px-6 py-12 text-center text-slate-400 italic">No passengers found.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </main>
    </div>
  `
})
export class AdminPassengers {
  authService = inject(AuthService);
  passengers = signal<UserProfile[]>([]);
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
    const path = 'passengers';
    const q = query(collection(getDb(), path), orderBy('createdAt', 'desc'));
    this.unsubscribe = onSnapshot(q, (snapshot) => {
      this.passengers.set(snapshot.docs.map(docSnap => ({ uid: docSnap.id, ...docSnap.data() } as UserProfile)));
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

  getStatusClass(status?: string) {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'rejected': return 'bg-danger/10 text-danger';
      default: return 'bg-slate-100 text-slate-700';
    }
  }
}
