import {Component, inject, signal} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {AuthService} from '../../../services/auth';

@Component({
  selector: 'app-driver-login',
  imports: [RouterLink, MatIconModule, CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div class="max-w-md w-full bg-white rounded-[40px] p-10 shadow-xl border border-slate-100">
        <div class="flex flex-col items-center text-center mb-10">
          <div class="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 mb-6">
            <mat-icon class="text-white text-3xl">directions_car</mat-icon>
          </div>
          <h1 class="text-3xl font-bold text-slate-900 mb-2">Driver Portal</h1>
          <p class="text-slate-500">Sign in to manage your vehicle and QR code</p>
        </div>

        <!-- Tabs -->
        <div class="flex bg-slate-100 p-1 rounded-2xl mb-8">
          <button (click)="mode.set('login')" 
                  class="flex-1 py-2 rounded-xl text-sm font-bold transition-all bg-white shadow-sm text-slate-900">
            Login
          </button>
          <a routerLink="/driver/register" 
             class="flex-1 py-2 rounded-xl text-sm font-bold transition-all text-slate-500 text-center">
            Register
          </a>
        </div>

        <form (submit)="onSubmit($event)" class="space-y-4">
          <div>
            <label for="email" class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Email Address</label>
            <input type="email" id="email" [(ngModel)]="email" name="email" required
                   class="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-primary/20 outline-none transition-all">
          </div>
          <div>
            <label for="password" class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Password</label>
            <input type="password" id="password" [(ngModel)]="password" name="password" required
                   class="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-primary/20 outline-none transition-all">
          </div>

          <button type="submit" [disabled]="loading()" 
                  class="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 mt-4">
            @if (loading()) {
              <div class="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            } @else {
              Sign In
            }
          </button>
        </form>

        <div class="mt-6 text-center">
          <p class="text-sm text-slate-500">
            New driver? 
            <a routerLink="/driver/register" class="text-primary font-bold hover:underline">Start Registration</a>
          </p>
        </div>

        <div class="relative my-8">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-slate-100"></div>
          </div>
          <div class="relative flex justify-center text-xs uppercase">
            <span class="bg-white px-4 text-slate-400 font-bold tracking-widest">Or continue with</span>
          </div>
        </div>

        <button (click)="onGoogleLogin()" [disabled]="loading()" 
                class="w-full bg-white border border-slate-100 text-slate-600 py-4 rounded-2xl font-bold shadow-sm active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" class="w-5 h-5" alt="Google">
          Google Account
        </button>

        <div class="mt-8 pt-8 border-t border-slate-50 text-center">
          <a routerLink="/" class="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-1">
            <mat-icon class="text-sm">arrow_back</mat-icon> Back to Home
          </a>
        </div>
      </div>
    </div>
  `
})
export class DriverLogin {
  authService = inject(AuthService);
  router = inject(Router);
  
  mode = signal<'login'>('login');
  loading = signal(false);
  
  email = '';
  password = '';

  async onSubmit(e: Event) {
    e.preventDefault();
    if (!this.email || !this.password) return;
    
    this.loading.set(true);
    try {
      const profile = await this.authService.loginWithEmail(this.email, this.password);

      if (profile && profile.role !== 'driver' && profile.role !== 'admin') {
        alert(`Access Denied. You are registered as a ${profile.role}.`);
        await this.authService.logout();
        return;
      }

      this.router.navigate(['/driver/dashboard']);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Authentication failed';
      alert(msg);
    } finally {
      this.loading.set(false);
    }
  }

  async onGoogleLogin() {
    this.loading.set(true);
    try {
      await this.authService.loginAndNavigate('driver');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Google login failed';
      alert(msg);
    } finally {
      this.loading.set(false);
    }
  }
}
