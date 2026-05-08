import {Component, inject, signal, OnInit} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule} from '@angular/common';
import {AuthService} from '../../../services/auth';
import * as QRCode from 'qrcode';
import {getDb} from '../../../firebase';
import {doc, getDoc} from 'firebase/firestore';
import {DriverProfile} from '../../../models/types';

@Component({
  selector: 'app-driver-qr',
  imports: [RouterLink, MatIconModule, CommonModule],
  template: `
    <div class="min-h-screen bg-slate-900 flex flex-col text-white">
      <!-- Header -->
      <header class="p-6 flex items-center justify-between">
        <a routerLink="/driver/dashboard" class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
          <mat-icon>arrow_back</mat-icon>
        </a>
        <h1 class="font-bold text-lg">My QR Code</h1>
        <button (click)="authService.logout()" class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-danger transition-colors">
          <mat-icon>logout</mat-icon>
        </button>
      </header>

      <main class="flex-1 flex flex-col items-center justify-center p-8">
        <div class="bg-white p-8 rounded-[40px] shadow-2xl shadow-primary/20 flex flex-col items-center text-center max-w-sm w-full">
          <h2 class="text-slate-900 text-xl font-bold mb-2">{{ driverData()?.displayName || authService.profile()?.displayName }}</h2>
          <p class="text-slate-400 text-sm mb-8">Verified SafeRide Driver</p>

          <div class="bg-slate-50 p-6 rounded-3xl mb-8 border-2 border-primary/10">
            <img [src]="qrCodeUrl()" class="w-56 h-56" alt="Driver QR Code">
          </div>

          <div class="space-y-4 w-full">
            <div class="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl text-left">
              <div class="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <mat-icon>directions_car</mat-icon>
              </div>
              <div>
                <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle Plate</p>
                <p class="text-sm font-bold text-slate-900">{{ driverData()?.plateNumber || '---' }}</p>
              </div>
            </div>

            <button (click)="downloadQR()" class="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:bg-primary-dark transition-all">
              <mat-icon>download</mat-icon> Download QR Code
            </button>
          </div>
        </div>

        <p class="mt-8 text-white/40 text-center text-sm max-w-xs">
          Show this QR code to your passenger. They will scan it to verify your identity and start the trip.
        </p>
      </main>

      <footer class="p-8 flex justify-center">
        <button (click)="generateQR()" class="flex items-center gap-2 text-primary font-bold">
          <mat-icon>refresh</mat-icon> Refresh Code
        </button>
      </footer>
    </div>
  `
})
export class DriverQR implements OnInit {
  authService = inject(AuthService);
  qrCodeUrl = signal<string>('');
  driverData = signal<DriverProfile | null>(null);

  async ngOnInit() {
    const user = this.authService.user();
    if (user) {
      try {
        const docSnap = await getDoc(doc(getDb(), 'drivers', user.uid));
        if (docSnap.exists()) {
          this.driverData.set(docSnap.data() as DriverProfile);
        }
      } catch (err) {
        console.error('Failed to fetch driver data:', err);
      }
    }
    this.generateQR();
  }

  async generateQR() {
    const user = this.authService.user();
    if (user) {
      try {
        const urlContent = `${window.location.origin}/passenger/driver-details/${user.uid}`;
        const url = await QRCode.toDataURL(urlContent, {
          width: 600,
          margin: 2,
          color: {
            dark: '#1FAF5A',
            light: '#FFFFFF'
          }
        });
        this.qrCodeUrl.set(url);
      } catch (err) {
        console.error('QR generation failed', err);
      }
    }
  }

  downloadQR() {
    const url = this.qrCodeUrl();
    if (!url) return;

    const link = document.createElement('a');
    link.href = url;
    link.download = `SafeRide-QR-${this.driverData()?.displayName || 'Driver'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
