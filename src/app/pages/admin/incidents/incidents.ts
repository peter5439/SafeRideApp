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
                        <p class="text-sm font-bold text-slate-700">{{ incident.reporterName || 'Anonymous' }}</p>
                        <p class="text-[10px] text-slate-400 font-mono">{{ incident.reporterId.substring(0, 8) }}...</p>
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
                          <button (click)="viewDetails(incident)" class="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all" title="View & Add Notes">
                            <mat-icon class="text-sm">visibility</mat-icon>
                          </button>
                          
                          @if (incident.status === 'open') {
                            <button (click)="updateStatus(incident.id, 'investigating')" class="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all" title="Start Investigation">
                              <mat-icon class="text-sm">search</mat-icon>
                            </button>
                          } 
                          
                          @if (incident.status !== 'resolved' && incident.status !== 'dismissed') {
                            <button (click)="updateStatus(incident.id, 'resolved')" class="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-600 hover:text-white transition-all" title="Mark as Resolved">
                              <mat-icon class="text-sm">check</mat-icon>
                            </button>
                            <button (click)="updateStatus(incident.id, 'dismissed')" class="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-300 transition-all" title="Dismiss">
                              <mat-icon class="text-sm">close</mat-icon>
                            </button>
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

        <!-- Incident Detail & Action Modal -->
        @if (selectedIncident(); as incident) {
          <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div class="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
              <div class="p-8">
                <div class="flex justify-between items-start mb-6">
                  <div>
                    <span [class]="'text-[10px] font-black uppercase px-2 py-1 rounded-md ' + 
                      (incident.severity === 'high' ? 'bg-danger/10 text-danger' : 
                       incident.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700')">
                      {{ incident.severity }} Severity
                    </span>
                    <h2 class="text-2xl font-bold text-slate-900 mt-2">Incident Details</h2>
                  </div>
                  <button (click)="selectedIncident.set(null)" class="text-slate-400 hover:text-slate-600">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>

                <div class="grid grid-cols-2 gap-6 mb-8">
                  <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Reporter</p>
                    <p class="text-sm font-bold text-slate-700">{{ incident.reporterName || 'Anonymous' }}</p>
                    <p class="text-[10px] text-slate-400 font-mono mt-1 mb-2">ID: {{ incident.reporterId }}</p>
                    <a [routerLink]="['/admin/passengers', incident.reporterId]" class="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">View Passenger Profile</a>
                    @if (incident.reporterEmail) {
                      <p class="text-[10px] text-primary font-bold mt-1 flex items-center gap-1">
                        <mat-icon class="text-[12px] w-[12px] h-[12px]">email</mat-icon> {{ incident.reporterEmail }}
                      </p>
                    }
                  </div>
                  <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 font-mono">
                    <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Timestamp</p>
                    <p class="text-sm text-slate-700">{{ incident.timestamp | date:'medium' }}</p>
                  </div>
                </div>

                <div class="mb-8">
                  <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Original Description</p>
                  <p class="text-slate-700 leading-relaxed p-4 bg-slate-50 rounded-2xl italic border-l-4 border-primary">
                    "{{ incident.description }}"
                  </p>
                </div>

                <div class="mb-8">
                  <label for="adminNotes" class="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Internal Admin Notes</label>
                  <textarea 
                    id="adminNotes"
                    #notesInput
                    class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-slate-700 min-h-[120px] focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="Document investigation steps, findings, and resolution summary...">{{ incident.adminNotes }}</textarea>
                </div>

                @if (incident.driverId) {
                  <div class="mb-8 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <mat-icon class="text-amber-600">directions_car</mat-icon>
                      <div>
                        <p class="text-xs font-bold text-amber-900">Involves Driver: {{ incident.driverName || 'N/A' }}</p>
                        <p class="text-[10px] text-amber-700">Driver ID: {{ incident.driverId }}</p>
                        @if (incident.tripId) {
                          <p class="text-[10px] text-amber-700">Trip ID: {{ incident.tripId }}</p>
                        }
                      </div>
                    </div>
                    <a [routerLink]="['/admin/drivers', incident.driverId]" class="text-xs font-black uppercase tracking-widest text-amber-600 hover:underline">View Driver Profile</a>
                  </div>
                }

                <div class="flex gap-4">
                  <button (click)="saveNotes(incident.id, notesInput.value)" class="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                    <mat-icon class="text-sm">save</mat-icon> Save Notes
                  </button>
                  
                  @if (incident.status !== 'resolved' && incident.status !== 'dismissed') {
                    <button (click)="updateStatus(incident.id, 'resolved', notesInput.value)" class="flex-1 bg-green-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-green-200 hover:bg-green-700 transition-all flex items-center justify-center gap-2">
                      <mat-icon class="text-sm">check_circle</mat-icon> Resolve Incident
                    </button>
                  }
                </div>
              </div>
            </div>
          </div>
        }
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
  selectedIncident = signal<Incident | null>(null);
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
      
      // Update selected incident if it exists in the new data
      const currentSelected = this.selectedIncident();
      if (currentSelected) {
        const updated = data.find(i => i.id === currentSelected.id);
        if (updated) this.selectedIncident.set(updated);
      }
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

  viewDetails(incident: Incident) {
    this.selectedIncident.set(incident);
  }

  async saveNotes(id: string, notes: string) {
    const path = `incidents/${id}`;
    try {
      await updateDoc(doc(getDb(), 'incidents', id), { adminNotes: notes });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  async updateStatus(id: string, status: string, notes?: string) {
    const path = `incidents/${id}`;
    try {
      const updateData: Partial<Incident> = { status: status as Incident['status'] };
      if (notes !== undefined) {
        updateData.adminNotes = notes;
      }
      if (status === 'resolved') {
        updateData.resolvedAt = new Date().toISOString();
        updateData.resolvedBy = this.authService.user()?.uid;
      }
      await updateDoc(doc(getDb(), 'incidents', id), updateData);
      if (status === 'resolved' || status === 'dismissed') {
        this.selectedIncident.set(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
}
