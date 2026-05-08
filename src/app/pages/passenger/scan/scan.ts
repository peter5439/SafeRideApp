import {Component, inject, signal, OnInit, OnDestroy} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule} from '@angular/common';
import {getDb, handleFirestoreError, OperationType} from '../../../firebase';
import {collection, query, getDocs, where, addDoc, doc, getDoc} from 'firebase/firestore';
import {AuthService} from '../../../services/auth';
import {Html5Qrcode} from 'html5-qrcode';
import {DriverProfile} from '../../../models/types';

@Component({
  selector: 'app-passenger-scan',
  imports: [RouterLink, MatIconModule, CommonModule],
  template: `
    <div class="min-h-screen bg-black flex flex-col text-white">
      <!-- Header -->
      <header class="p-6 flex items-center justify-between sticky top-0 z-20 bg-black/50 backdrop-blur-md">
        <a routerLink="/passenger/home" class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
          <mat-icon>arrow_back</mat-icon>
        </a>
        <h1 class="font-bold text-lg">Scan QR Code</h1>
        <button (click)="authService.logout()" class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-danger transition-colors">
          <mat-icon>logout</mat-icon>
        </button>
      </header>

      <!-- Scanner Area -->
      <div class="flex-1 flex flex-col items-center justify-center p-6 relative">
        <div class="w-full max-w-sm aspect-square border-2 border-primary rounded-3xl relative overflow-hidden bg-slate-900">
          <!-- The Scanner Container -->
          <div id="reader" class="absolute inset-0"></div>
          
          <!-- Scanning Animation Overlay (only if not scanning yet or if we want a custom look) -->
          @if (!isScanning()) {
            <div class="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 z-10 p-6 text-center">
              @if (errorMessage()) {
                <mat-icon class="text-danger text-4xl mb-2">error_outline</mat-icon>
                <p class="text-danger text-xs mb-4">{{ errorMessage() }}</p>
                <div class="text-[10px] text-white/40 mb-4 px-4 bg-white/5 py-3 rounded-lg">
                  <p class="font-bold mb-1">Common Fixes:</p>
                  <ul class="list-disc list-inside text-left">
                    <li>Use <b>https://</b> (camera requires secure context)</li>
                    <li>Grant camera permissions</li>
                    <li>Use <b>localhost</b> directly</li>
                  </ul>
                </div>
              } @else {
                <mat-icon class="text-6xl text-white/20 mb-4">camera_alt</mat-icon>
              }
              <button (click)="startScanner()" class="bg-primary text-white px-6 py-2 rounded-xl font-bold">
                {{ errorMessage() ? 'Try Again' : 'Start Camera' }}
              </button>
            </div>
          } @else {
            <div class="absolute inset-0 pointer-events-none z-10">
              <div class="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl"></div>
              <div class="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl"></div>
              <div class="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl"></div>
              <div class="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl"></div>
              <div class="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent h-1/2 animate-scan"></div>
            </div>
          }
        </div>

        <p class="mt-8 text-white/60 text-center max-w-xs">
          Position the driver's QR code within the frame to scan automatically.
        </p>

        <!-- Simulated Scan Button for Demo -->
        <div class="mt-12 w-full max-w-xs space-y-4">
          <button (click)="simulateScan()" class="w-full bg-white/10 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform border border-white/10">
            <mat-icon>bolt</mat-icon> Simulate Scan (Demo)
          </button>
        </div>
      </div>

      <!-- Footer -->
      <footer class="p-8 flex justify-center">
        <button (click)="toggleFlash()" class="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center" [class.text-primary]="flashOn()">
          <mat-icon>{{ flashOn() ? 'flashlight_off' : 'flashlight_on' }}</mat-icon>
        </button>
      </footer>

      <!-- Loading Overlay -->
      @if (loading()) {
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p class="font-bold">{{ loadingMessage() }}</p>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes scan {
      0% { transform: translateY(-100%); }
      100% { transform: translateY(200%); }
    }
    .animate-scan {
      animation: scan 2s linear infinite;
    }
    #reader ::ng-deep video {
      width: 100% !important;
      height: 100% !important;
      object-fit: cover !important;
    }
  `]
})
export class PassengerScan implements OnInit, OnDestroy {
  router = inject(Router);
  authService = inject(AuthService);
  loading = signal(false);
  loadingMessage = signal('Verifying Driver...');
  isScanning = signal(false);
  flashOn = signal(false);
  errorMessage = signal<string | null>(null);
  
  private html5QrCode: Html5Qrcode | null = null;

  ngOnInit() {
    // We don't start automatically to avoid permission prompts immediately
    console.log('Scanner initialized');
  }

  ngOnDestroy() {
    this.stopScanner();
  }

  async startScanner() {
    this.errorMessage.set(null);
    try {
      this.html5QrCode = new Html5Qrcode("reader");
      this.isScanning.set(true);
      
      const config = { fps: 10, qrbox: { width: 250, height: 250 } };
      
      await this.html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          this.onScanSuccess(decodedText);
        },
        () => {
          // parse error, ignore it.
        }
      );
    } catch (err: any) {
      console.error("Unable to start scanner", err);
      this.isScanning.set(false);
      
      if (err?.name === 'NotAllowedError') {
        this.errorMessage.set('Permission denied. Please allow camera access.');
      } else if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        this.errorMessage.set('Insecure context. Cameras require HTTPS.');
      } else {
        this.errorMessage.set(err?.message || 'Unable to access camera.');
      }
    }
  }

  async stopScanner() {
    if (this.html5QrCode && this.html5QrCode.isScanning) {
      try {
        await this.html5QrCode.stop();
        this.isScanning.set(false);
      } catch (err) {
        console.error("Unable to stop scanner", err);
      }
    }
  }

  toggleFlash() {
    // Flashlight control is complex with html5-qrcode, usually requires camera track access
    // For now we'll just toggle the signal
    this.flashOn.update(v => !v);
  }

  async onScanSuccess(decodedText: string) {
    // The QR code might contain a full URL or just the driverId
    let driverId = decodedText;
    if (decodedText.includes('/passenger/driver-details/')) {
      driverId = decodedText.split('/passenger/driver-details/').pop() || decodedText;
    }
    await this.processDriver(driverId);
  }

  async processDriver(driverId: string) {
    const user = this.authService.user();
    if (!user) {
      alert('Please sign in to start a trip.');
      return;
    }

    this.loading.set(true);
    this.loadingMessage.set('Verifying Driver...');
    await this.stopScanner();

    const path = 'trips';
    try {
      // Verify specific driver exists and is verified
      const driverDoc = await getDoc(doc(getDb(), 'drivers', driverId));
      
      if (!driverDoc.exists()) {
        throw new Error('Driver not found');
      }

      const driverData = driverDoc.data() as DriverProfile;
      
      if (driverData.verificationStatus === 'banned') {
        throw new Error('This driver has been restricted due to safety reports and cannot start new trips.');
      }

      if (driverData.verificationStatus !== 'verified' && !driverId.startsWith('demo-')) {
        throw new Error('Driver is not verified');
      }

      // Get current location
      let location = { latitude: 0, longitude: 0 };
      try {
        const pos = await this.getCurrentPosition();
        location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } catch (locErr) {
        console.warn('Could not get location', locErr);
      }

      // Record the trip
      await addDoc(collection(getDb(), path), {
        passengerId: user.uid,
        passengerName: user.displayName || 'Passenger',
        driverId: driverId,
        driverName: driverData.displayName || 'Verified Driver',
        timestamp: new Date().toISOString(),
        location: location,
        status: 'active'
      });

      this.loadingMessage.set('Trip Started!');
      setTimeout(() => {
        this.loading.set(false);
        this.router.navigate(['/passenger/driver-details', driverId]);
      }, 1000);
      
    } catch (error) {
      console.error('Scan processing failed', error);
      this.loading.set(false);
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  private getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  }

  async simulateScan() {
    this.loading.set(true);
    this.loadingMessage.set('Simulating Scan...');
    
    try {
      const driversRef = collection(getDb(), 'drivers');
      const q = query(driversRef, where('verificationStatus', '==', 'verified'));
      const querySnapshot = await getDocs(q);
      
      let driverId = 'demo-driver-123';
      if (!querySnapshot.empty) {
        driverId = querySnapshot.docs[0].id;
      }

      await this.processDriver(driverId);
      
    } catch (error) {
      console.error('Scan simulation failed', error);
      this.loading.set(false);
    }
  }
}
