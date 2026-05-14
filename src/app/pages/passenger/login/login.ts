import {Component, inject, signal} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {AuthService} from '../../../services/auth';

@Component({
  selector: 'app-passenger-login',
  imports: [RouterLink, MatIconModule, CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div class="max-w-md w-full bg-white rounded-[40px] p-10 shadow-xl border border-slate-100">
        <div class="flex flex-col items-center text-center mb-10">
          <div class="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center shadow-lg shadow-accent/20 mb-6">
            <mat-icon class="text-white text-3xl">person</mat-icon>
          </div>
          <h1 class="text-3xl font-bold text-slate-900 mb-2">Passenger Portal</h1>
          <p class="text-slate-500">Sign in to access safety features and trip history</p>
        </div>

        <!-- Tabs -->
        <div class="flex bg-slate-100 p-1 rounded-2xl mb-8">
          <button (click)="mode.set('login')" 
                  [class]="'flex-1 py-2 rounded-xl text-sm font-bold transition-all ' + (mode() === 'login' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500')">
            Login
          </button>
          <button (click)="mode.set('register')" 
                  [class]="'flex-1 py-2 rounded-xl text-sm font-bold transition-all ' + (mode() === 'register' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500')">
            Register
          </button>
        </div>

        <form (submit)="onSubmit($event)" class="space-y-4">
          @if (mode() === 'register') {
            <div>
              <label for="reg-name" class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Full Name</label>
              <input type="text" id="reg-name" [(ngModel)]="name" name="name" required
                     class="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-accent/20 outline-none transition-all">
            </div>
          }
          <div>
            <label for="email" class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Email Address</label>
            <input type="email" id="email" [(ngModel)]="email" name="email" required
                   class="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-accent/20 outline-none transition-all">
          </div>
          <div class="relative group">
            <label for="password" class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Password</label>
            <div class="relative">
              <input [type]="showPassword() ? 'text' : 'password'" id="password" [(ngModel)]="password" name="password" required
                     class="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-accent/20 outline-none transition-all pr-12">
              <button type="button" 
                      (click)="showPassword.set(!showPassword())"
                      class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-accent transition-colors">
                <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </div>
          </div>

          <button type="submit" [disabled]="loading()" 
                  class="w-full bg-accent text-white py-4 rounded-2xl font-bold shadow-lg shadow-accent/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 mt-4">
            @if (loading()) {
              <div class="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            } @else {
              {{ mode() === 'login' ? 'Sign In' : 'Create Account' }}
            }
          </button>
        </form>

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
export class PassengerLogin {
  authService = inject(AuthService);
  router = inject(Router);
  
  mode = signal<'login' | 'register'>('login');
  loading = signal(false);
  showPassword = signal(false);
  
  email = '';
  password = '';
  name = '';

  async onSubmit(e: Event) {
    e.preventDefault();
    if (!this.email || !this.password || (this.mode() === 'register' && !this.name)) return;
    
    this.loading.set(true);
    try {
      let profile;
      if (this.mode() === 'register') {
        profile = await this.authService.registerWithEmail(this.email, this.password, this.name, 'passenger');
      } else {
        profile = await this.authService.loginWithEmail(this.email, this.password);
      }

      if (profile && profile.role !== 'passenger' && profile.role !== 'admin') {
        alert(`Access Denied. You are registered as a ${profile.role}.`);
        await this.authService.logout();
        return;
      }

      await this.authService.navigateAfterLogin(profile!);
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
      await this.authService.loginAndNavigate('passenger');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Google login failed';
      alert(msg);
    } finally {
      this.loading.set(false);
    }
  }
}
