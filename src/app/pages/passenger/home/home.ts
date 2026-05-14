import {Component, inject, signal, OnInit, OnDestroy} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {AuthService} from '../../../services/auth';
import {CommonModule} from '@angular/common';
import {getDb, handleFirestoreError, OperationType} from '../../../firebase';
import {collection, query, where, onSnapshot, Unsubscribe} from 'firebase/firestore';
import {Trip} from '../../../models/types';

@Component({
  selector: 'app-passenger-home',
  imports: [RouterLink, MatIconModule, CommonModule],
  template: `
    <div class="min-h-screen bg-slate-50 flex flex-col">
      <!-- Header -->
      <header class="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div class="flex items-center gap-2">
          <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
            <mat-icon class="text-white">verified_user</mat-icon>
          </div>
          <div class="flex flex-col">
            <span class="font-display font-bold text-lg tracking-tight leading-tight">SafeRide</span>
            @if (authService.profile()?.verificationStatus === 'verified') {
              <div class="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-green-600">
                <mat-icon class="text-[10px] w-[10px] h-[10px]">verified</mat-icon> Verified
              </div>
            } @else {
              <div class="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-slate-400">
                <mat-icon class="text-[10px] w-[10px] h-[10px]">help_outline</mat-icon> Unverified
              </div>
            }
          </div>
        </div>
        <div class="flex items-center gap-3">
          <a routerLink="/passenger/profile" class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors">
            @if (authService.profile()?.profileImageUrl) {
              <img [src]="authService.profile()?.profileImageUrl" class="w-full h-full object-cover rounded-full" alt="Profile">
            } @else {
              <mat-icon>person</mat-icon>
            }
          </a>
          <button (click)="authService.logout()" class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors">
            <mat-icon>logout</mat-icon>
          </button>
        </div>
      </header>

      <main class="flex-1 p-6 max-w-md mx-auto w-full">
        <!-- Active Ride Banner -->
        @if (activeTrip()) {
          <div class="mb-6 animate-bounce-subtle">
            <a [routerLink]="['/passenger/ride', activeTrip()?.id]" class="bg-accent text-white p-4 rounded-2xl shadow-lg shadow-accent/20 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <mat-icon>local_taxi</mat-icon>
                </div>
                <div>
                  <p class="text-[10px] font-black uppercase tracking-widest text-white/70">Ride in Progress</p>
                  <p class="font-bold">Tap to view details</p>
                </div>
              </div>
              <mat-icon>chevron_right</mat-icon>
            </a>
          </div>
        }

        <!-- Welcome Section -->
        <section class="mb-8 flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-slate-900 mb-2">Hello, {{ authService.profile()?.displayName || 'Passenger' }}!</h1>
            <p class="text-slate-500">Your safety is our priority.</p>
          </div>
          @if (authService.profile()?.verificationStatus !== 'verified') {
            <a routerLink="/passenger/profile" class="bg-amber-100 text-amber-700 w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse">
              <mat-icon>priority_high</mat-icon>
            </a>
          }
        </section>

        <!-- Verification Notice -->
        @if (authService.profile()?.verificationStatus === 'unverified') {
          <div class="mb-8 p-4 bg-primary/5 border border-primary/10 rounded-2xl flex gap-4 items-center">
             <div class="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary flex-shrink-0">
               <mat-icon>shield</mat-icon>
             </div>
             <div class="flex-1">
               <h3 class="text-xs font-bold text-slate-900 mb-1">Verify Your Identity</h3>
               <p class="text-[10px] text-slate-500 mb-2">Build trust and access premium safety features.</p>
               <a routerLink="/passenger/profile" class="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">Get Started</a>
             </div>
          </div>
        } @else if (authService.profile()?.verificationStatus === 'pending') {
          <div class="mb-8 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-4 items-center">
             <div class="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 flex-shrink-0">
               <mat-icon>schedule</mat-icon>
             </div>
             <div class="flex-1">
               <h3 class="text-xs font-bold text-slate-900 mb-1">Verification Processing</h3>
               <p class="text-[10px] text-slate-500">Our team is reviewing your documents.</p>
             </div>
          </div>
        } @else if (authService.profile()?.verificationStatus === 'rejected') {
          <div class="mb-8 p-4 bg-danger/5 border border-danger/10 rounded-2xl flex gap-4 items-center">
             <div class="w-12 h-12 bg-danger/10 rounded-2xl flex items-center justify-center text-danger flex-shrink-0">
               <mat-icon>error_outline</mat-icon>
             </div>
             <div class="flex-1">
               <h3 class="text-xs font-bold text-slate-900 mb-1">Verification Rejected</h3>
               <p class="text-[10px] text-slate-500 mb-2">Check details and resubmit documents.</p>
               <a routerLink="/passenger/profile" class="text-[10px] font-black uppercase tracking-widest text-danger hover:underline">View Reason</a>
             </div>
          </div>
        }

        <!-- Primary CTA -->
        <div class="mb-10">
          <a routerLink="/passenger/scan" class="relative overflow-hidden bg-primary text-white p-8 rounded-3xl shadow-xl shadow-primary/20 flex flex-col items-center text-center group active:scale-95 transition-all duration-300">
            <div class="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div class="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm">
              <mat-icon class="text-4xl">qr_code_scanner</mat-icon>
            </div>
            <h2 class="text-2xl font-bold mb-2">Scan Driver QR</h2>
            <p class="text-white/80 text-sm">Verify driver details and share trip info instantly.</p>
          </a>
        </div>

        <!-- Safety Tips Banner -->
        <div class="bg-accent/10 border border-accent/20 p-4 rounded-2xl mb-8 flex gap-4 items-start">
          <div class="w-10 h-10 bg-accent/20 rounded-full flex-shrink-0 flex items-center justify-center">
            <mat-icon class="text-accent">lightbulb</mat-icon>
          </div>
          <div>
            <h3 class="font-bold text-accent text-sm mb-1">Safety Tip</h3>
            <p class="text-slate-700 text-xs leading-relaxed">Always check that the vehicle plate number matches the one shown after scanning.</p>
          </div>
        </div>

        <!-- Quick Actions Grid -->
        <div class="grid grid-cols-2 gap-4 mb-8">
          <a routerLink="/passenger/emergency" class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center hover:bg-slate-50 transition-colors">
            <div class="w-12 h-12 bg-danger/10 rounded-full flex items-center justify-center mb-3">
              <mat-icon class="text-danger">emergency</mat-icon>
            </div>
            <span class="font-bold text-sm">Emergency</span>
          </a>
          <a routerLink="/passenger/contacts" class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center hover:bg-slate-50 transition-colors">
            <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <mat-icon class="text-blue-600">people</mat-icon>
            </div>
            <span class="font-bold text-sm">Contacts</span>
          </a>
          <a routerLink="/passenger/history" class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center hover:bg-slate-50 transition-colors">
            <div class="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
              <mat-icon class="text-slate-600">history</mat-icon>
            </div>
            <span class="font-bold text-sm">Trip History</span>
          </a>
          <a routerLink="/passenger/lost-items" class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center hover:bg-slate-50 transition-colors">
            <div class="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mb-3">
              <mat-icon class="text-amber-600">inventory_2</mat-icon>
            </div>
            <span class="font-bold text-sm">Lost Items</span>
          </a>
        </div>
      </main>

      <!-- Bottom Nav (Mobile Style) -->
      <nav class="bg-white border-t border-slate-100 px-6 py-3 flex justify-around items-center sticky bottom-0">
        <a routerLink="/passenger/home" class="flex flex-col items-center text-primary">
          <mat-icon>home</mat-icon>
          <span class="text-[10px] font-bold uppercase tracking-wider mt-1">Home</span>
        </a>
        <a routerLink="/passenger/scan" class="flex flex-col items-center text-slate-400">
          <mat-icon>qr_code_scanner</mat-icon>
          <span class="text-[10px] font-bold uppercase tracking-wider mt-1">Scan</span>
        </a>
        <a routerLink="/passenger/history" class="flex flex-col items-center text-slate-400">
          <mat-icon>history</mat-icon>
          <span class="text-[10px] font-bold uppercase tracking-wider mt-1">Trips</span>
        </a>
        <a routerLink="/passenger/emergency" class="flex flex-col items-center text-danger">
          <mat-icon>emergency</mat-icon>
          <span class="text-[10px] font-bold uppercase tracking-wider mt-1">SOS</span>
        </a>
      </nav>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    @keyframes bounce-subtle {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-4px); }
    }
    .animate-bounce-subtle {
      animation: bounce-subtle 2s infinite ease-in-out;
    }
  `]
})
export class PassengerHome implements OnInit, OnDestroy {
  authService = inject(AuthService);
  activeTrip = signal<Trip | null>(null);
  private unsub: Unsubscribe | null = null;

  ngOnInit() {
    const user = this.authService.user();
    if (user) {
      const q = query(
        collection(getDb(), 'trips'),
        where('passengerId', '==', user.uid),
        where('status', '==', 'active')
      );
      this.unsub = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          this.activeTrip.set({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Trip);
        } else {
          this.activeTrip.set(null);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'trips');
      });
    }
  }

  ngOnDestroy() {
    if (this.unsub) this.unsub();
  }
}
