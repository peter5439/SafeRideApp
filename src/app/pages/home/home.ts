import {Component, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {AuthService} from '../../services/auth';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-home',
  imports: [RouterLink, MatIconModule, CommonModule],
  template: `
    <div class="min-h-screen flex flex-col items-center p-6 bg-gradient-to-br from-primary/5 to-accent/5 relative">
      @if (authService.loading()) {
        <div class="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
          <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p class="font-display font-bold text-slate-900 uppercase tracking-widest text-xs">Authenticating...</p>
        </div>
      }

      <div class="max-w-4xl w-full text-center mb-12 mt-12">
        <div class="flex items-center justify-center mb-6">
          <div class="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
            <mat-icon class="text-white text-4xl">verified_user</mat-icon>
          </div>
        </div>
        <h1 class="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">SafeRide</h1>
        <p class="text-lg text-slate-600 max-w-2xl mx-auto">
          Driver Verification & Passenger Safety System. Choose your portal to get started.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        <!-- Passenger Portal -->
        <a routerLink="/passenger/login" class="group bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 flex flex-col items-center text-center">
          <div class="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <mat-icon class="text-accent text-3xl">person</mat-icon>
          </div>
          <h2 class="text-xl font-bold mb-2">Passenger</h2>
          <p class="text-slate-500 text-sm mb-6">Scan driver QR codes, share trip details, and stay safe with emergency alerts.</p>
          <span class="mt-auto text-accent font-semibold flex items-center group-hover:translate-x-1 transition-transform">
            Enter Portal <mat-icon class="ml-1 text-sm">arrow_forward</mat-icon>
          </span>
        </a>

        <!-- Driver Portal -->
        <a routerLink="/driver/login" class="group bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 flex flex-col items-center text-center">
          <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <mat-icon class="text-primary text-3xl">directions_car</mat-icon>
          </div>
          <h2 class="text-xl font-bold mb-2">Driver</h2>
          <p class="text-slate-500 text-sm mb-6">Register your vehicle, get verified, and provide your unique QR code to passengers.</p>
          <span class="mt-auto text-primary font-semibold flex items-center group-hover:translate-x-1 transition-transform">
            Enter Portal <mat-icon class="ml-1 text-sm">arrow_forward</mat-icon>
          </span>
        </a>

        <!-- Admin Portal -->
        <a routerLink="/admin/login" class="group bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 flex flex-col items-center text-center">
          <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <mat-icon class="text-slate-600 text-3xl">admin_panel_settings</mat-icon>
          </div>
          <h2 class="text-xl font-bold mb-2">Admin</h2>
          <p class="text-slate-500 text-sm mb-6">Manage driver verifications, monitor safety alerts, and handle incident reports.</p>
          <span class="mt-auto text-slate-600 font-semibold flex items-center group-hover:translate-x-1 transition-transform">
            Enter Portal <mat-icon class="ml-1 text-sm">arrow_forward</mat-icon>
          </span>
        </a>
      </div>

      <footer class="mt-16 text-slate-400 text-sm">
        &copy; 2026 SafeRide. All rights reserved.
      </footer>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class Home {
  authService = inject(AuthService);
}
