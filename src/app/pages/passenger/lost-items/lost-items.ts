import {Component, signal, inject, OnInit, OnDestroy} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule} from '@angular/common';
import {getDb, handleFirestoreError, OperationType} from '../../../firebase';
import {collection, query, where, onSnapshot, orderBy, Unsubscribe, doc, getDoc} from 'firebase/firestore';
import {LostItem, DriverProfile} from '../../../models/types';
import {AuthService} from '../../../services/auth';

@Component({
  selector: 'app-passenger-lost-items',
  standalone: true,
  imports: [RouterLink, MatIconModule, CommonModule],
  template: `
    <div class="min-h-screen bg-slate-50 flex flex-col">
      <!-- Header -->
      <header class="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-100 sticky top-0 z-10">
        <a routerLink="/passenger/home" class="text-slate-600">
          <mat-icon>arrow_back</mat-icon>
        </a>
        <h1 class="font-bold text-lg">Lost Items</h1>
        <div class="w-6"></div>
      </header>

      <main class="flex-1 p-6 max-w-md mx-auto w-full">
        @if (loading()) {
          <div class="flex flex-col items-center justify-center py-20">
            <div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Loading Reports</p>
          </div>
        } @else {
          <div class="space-y-4">
            @for (item of items(); track item.id) {
              <div class="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                <div class="flex items-start justify-between mb-4">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                      <mat-icon>inventory_2</mat-icon>
                    </div>
                    <div>
                      <h3 class="font-bold text-slate-900">{{ item.description }}</h3>
                      <p class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{{ item.timestamp | date:'mediumDate' }}</p>
                    </div>
                  </div>
                  <span [class]="'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ' + getStatusClass(item.status)">
                    {{ item.status }}
                  </span>
                </div>

                <div class="bg-slate-50 rounded-2xl p-4 mb-4">
                  <div class="flex items-center gap-3 mb-2">
                    <mat-icon class="text-slate-400 text-sm">directions_car</mat-icon>
                    <span class="text-xs text-slate-600 font-medium">Driver: {{ item.driverName }}</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <mat-icon class="text-slate-400 text-sm">tag</mat-icon>
                    <span class="text-xs text-slate-600 font-medium">Trip ID: {{ item.tripId }}</span>
                  </div>
                </div>

                @if (item.status === 'found') {
                  <div class="flex flex-col gap-3">
                    <p class="text-xs text-green-600 font-medium bg-green-50 p-3 rounded-xl border border-green-100">
                      Great news! Your item has been found. You can contact the driver to arrange a return.
                    </p>
                    <div class="flex gap-2">
                      <a [href]="'mailto:' + driverEmails()[item.driverId]" class="flex-1 bg-primary text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2">
                        <mat-icon class="text-sm">mail</mat-icon> Email Driver
                      </a>
                      <a [href]="'tel:' + driverPhones()[item.driverId]" class="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2">
                        <mat-icon class="text-sm">phone</mat-icon> Call Driver
                      </a>
                    </div>
                  </div>
                } @else if (item.status === 'reported') {
                  <p class="text-xs text-slate-500 italic">
                    The driver has been notified. We'll update you as soon as there's news.
                  </p>
                } @else if (item.status === 'returned') {
                  <div class="flex items-center gap-2 text-green-600">
                    <mat-icon class="text-sm">check_circle</mat-icon>
                    <span class="text-xs font-bold uppercase tracking-wider">Item Returned</span>
                  </div>
                }
              </div>
            } @empty {
              <div class="text-center py-20">
                <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                  <mat-icon class="text-5xl">search_off</mat-icon>
                </div>
                <h2 class="text-xl font-bold text-slate-900 mb-2">No Reports</h2>
                <p class="text-slate-500 text-sm">Items you report as lost will appear here.</p>
                <a routerLink="/passenger/history" class="inline-block bg-primary text-white px-6 py-2 rounded-xl font-bold mt-6">
                  Go to History
                </a>
              </div>
            }
          </div>
        }
      </main>
    </div>
  `
})
export class PassengerLostItems implements OnInit, OnDestroy {
  authService = inject(AuthService);
  items = signal<LostItem[]>([]);
  loading = signal(true);
  driverEmails = signal<Record<string, string>>({});
  driverPhones = signal<Record<string, string>>({});
  private unsub: Unsubscribe | null = null;

  ngOnInit() {
    const user = this.authService.user();
    if (user) {
      const q = query(
        collection(getDb(), 'lost_items'),
        where('passengerId', '==', user.uid),
        orderBy('timestamp', 'desc')
      );

      this.unsub = onSnapshot(q, async (snapshot) => {
        const itemData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LostItem));
        this.items.set(itemData);
        
        // Fetch driver contact info for found items
        for (const item of itemData) {
          if (item.status === 'found' && !this.driverEmails()[item.driverId]) {
            const driverDoc = await getDoc(doc(getDb(), 'drivers', item.driverId));
            if (driverDoc.exists()) {
              const d = driverDoc.data() as DriverProfile;
              this.driverEmails.update(prev => ({ ...prev, [item.driverId]: d.email }));
              this.driverPhones.update(prev => ({ ...prev, [item.driverId]: d.phoneNumber }));
            }
          }
        }
        this.loading.set(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'lost_items');
        this.loading.set(false);
      });
    }
  }

  ngOnDestroy() {
    if (this.unsub) this.unsub();
  }

  getStatusClass(status: string) {
    switch (status) {
      case 'reported': return 'bg-amber-100 text-amber-600';
      case 'found': return 'bg-green-100 text-green-600';
      case 'returned': return 'bg-slate-100 text-slate-400';
      default: return 'bg-slate-100 text-slate-600';
    }
  }
}
