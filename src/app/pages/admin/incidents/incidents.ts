import {Component, signal, inject, effect} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule} from '@angular/common';
import {getDb, handleFirestoreError, OperationType} from '../../../firebase';
import {collection, onSnapshot, query, orderBy, doc, updateDoc, Unsubscribe} from 'firebase/firestore';
import {Incident} from '../../../models/types';
import {AuthService} from '../../../services/auth';

@Component({
  selector: 'app-admin-incidents',
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
          <a routerLink="/admin/incidents" class="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary text-white font-bold">
            <mat-icon>report_problem</mat-icon> Incidents
          </a>
          <a routerLink="/admin/passengers" class="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all">
            <mat-icon>people</mat-icon> Passengers
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
            <h1 class="text-xl font-bold text-slate-900">Incident Reports</h1>
          </div>
          <div class="flex items-center gap-6">
            <span class="text-xs font-bold text-danger bg-danger/5 px-3 py-1 rounded-full">{{ openCount() }} Open Alerts</span>
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
              <p class="text-slate-400 font-bold uppercase tracking-widest">Loading Incidents</p>
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
                    <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Severity</th>
                    <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Reporter</th>
                    <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Description</th>
                    <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Time</th>
                    <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">
                  @for (incident of incidents(); track incident.id) {
                    <tr class="hover:bg-slate-50/50 transition-colors">
                      <td class="px-6 py-4">
                        <span [class]="'text-[10px] font-black uppercase px-2 py-1 rounded-md ' + 
                          (incident.severity === 'high' ? 'bg-danger/10 text-danger' : 
                           incident.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700')">
                          {{ incident.severity }}
                        </span>
                      </td>
                      <td class="px-6 py-4">
                        <p class="text-sm font-bold text-slate-700">{{ incident.reporterId.substring(0, 8) }}...</p>
                      </td>
                      <td class="px-6 py-4 text-sm text-slate-600">{{ incident.description }}</td>
                      <td class="px-6 py-4">
                        <span [class]="'text-xs font-bold ' + (incident.status === 'open' ? 'text-danger' : 'text-slate-500')">
                          {{ incident.status }}
                        </span>
                      </td>
                      <td class="px-6 py-4 text-xs text-slate-400">{{ incident.timestamp | date:'medium' }}</td>
                      <td class="px-6 py-4">
                        <div class="flex items-center gap-2">
                          @if (incident.status === 'open') {
                            <button (click)="updateStatus(incident.id, 'investigating')" class="text-xs font-bold text-primary hover:underline">Investigate</button>
                          } @else if (incident.status === 'investigating') {
                            <button (click)="updateStatus(incident.id, 'resolved')" class="text-xs font-bold text-green-600 hover:underline">Resolve</button>
                          }
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6" class="px-6 py-12 text-center text-slate-400 italic">No incidents reported.</td>
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
export class AdminIncidents {
  authService = inject(AuthService);
  incidents = signal<Incident[]>([]);
  openCount = signal(0);
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
    const path = 'incidents';
    const q = query(collection(getDb(), path), orderBy('timestamp', 'desc'));
    this.unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Incident));
      this.incidents.set(data);
      this.openCount.set(data.filter(i => i.status === 'open').length);
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

  async updateStatus(id: string, status: string) {
    const path = `incidents/${id}`;
    try {
      await updateDoc(doc(getDb(), 'incidents', id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
}
