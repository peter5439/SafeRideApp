import {Component, signal, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule} from '@angular/common';
import {getDb, handleFirestoreError, OperationType} from '../../../firebase';
import {collection, addDoc, getDocs, query, where} from 'firebase/firestore';
import {AuthService} from '../../../services/auth';
import {EmergencyContact, Trip, Incident} from '../../../models/types';

@Component({
  selector: 'app-passenger-emergency',
  imports: [RouterLink, MatIconModule, CommonModule],
  template: `
    <div class="min-h-screen bg-slate-50 flex flex-col">
      <!-- Header -->
      <header class="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-100">
        <a routerLink="/passenger/home" class="text-slate-600">
          <mat-icon>arrow_back</mat-icon>
        </a>
        <h1 class="font-bold text-lg text-danger">Emergency SOS</h1>
        <button (click)="authService.logout()" class="text-slate-400 hover:text-danger transition-colors">
          <mat-icon>logout</mat-icon>
        </button>
      </header>

      <main class="flex-1 p-6 flex flex-col items-center justify-center text-center">
        <div class="mb-12">
          <h2 class="text-3xl font-bold text-slate-900 mb-4">Need Help?</h2>
          <p class="text-slate-500">Press and hold the button below for 3 seconds to send an emergency alert.</p>
        </div>

        <!-- Emergency Button -->
        <div class="relative mb-12">
          <!-- Pulse Rings -->
          <div class="absolute inset-0 bg-danger/20 rounded-full animate-ping"></div>
          <div class="absolute inset-0 bg-danger/10 rounded-full animate-pulse scale-150"></div>
          
          <button 
            (mousedown)="startHold()" 
            (mouseup)="cancelHold()" 
            (mouseleave)="cancelHold()"
            (touchstart)="startHold()"
            (touchend)="cancelHold()"
            class="relative w-64 h-64 bg-danger rounded-full shadow-2xl shadow-danger/40 flex flex-col items-center justify-center text-white active:scale-95 transition-transform z-10 select-none"
          >
            <mat-icon class="text-7xl mb-2">emergency</mat-icon>
            <span class="text-2xl font-black tracking-widest">SOS</span>
          </button>

          <!-- Progress Circle -->
          @if (isHolding()) {
            <svg class="absolute inset-0 w-full h-full -rotate-90 z-20 pointer-events-none">
              <circle 
                cx="128" cy="128" r="120" 
                fill="none" 
                stroke="white" 
                stroke-width="8" 
                stroke-dasharray="753.6" 
                [attr.stroke-dashoffset]="753.6 * (1 - progress())"
                class="transition-all duration-100"
              />
            </svg>
          }
        </div>

        @if (alertSent()) {
          <div class="bg-green-100 text-green-800 p-4 rounded-2xl border border-green-200 animate-bounce">
            <p class="font-bold flex items-center gap-2">
              <mat-icon>check_circle</mat-icon> Emergency alert sent!
            </p>
          </div>
        } @else {
          <div class="flex flex-col items-center gap-2">
            @if (isSending()) {
              <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p class="text-primary font-bold text-xs uppercase tracking-widest">Sending Alerts...</p>
            } @else {
              <p class="text-slate-400 font-bold uppercase tracking-widest text-xs">Hold to activate</p>
            }
          </div>
        }
      </main>

      <!-- Emergency Info -->
      <div class="p-6 bg-white border-t border-slate-100">
        <h3 class="font-bold text-slate-900 mb-4">What happens next?</h3>
        <ul class="space-y-4">
          <li class="flex gap-3 items-start">
            <div class="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
              <mat-icon class="text-sm text-slate-600">location_on</mat-icon>
            </div>
            <p class="text-sm text-slate-600">Your live location will be shared with emergency contacts.</p>
          </li>
          <li class="flex gap-3 items-start">
            <div class="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
              <mat-icon class="text-sm text-slate-600">security</mat-icon>
            </div>
            <p class="text-sm text-slate-600">Admin system will be notified with your driver's details.</p>
          </li>
          <li class="flex gap-3 items-start">
            <div class="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
              <mat-icon class="text-sm text-slate-600">email</mat-icon>
            </div>
            <p class="text-sm text-slate-600">Email notifications will be sent to your trusted contacts.</p>
          </li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class PassengerEmergency {
  authService = inject(AuthService);
  isHolding = signal(false);
  isSending = signal(false);
  progress = signal(0);
  alertSent = signal(false);
  holdInterval: ReturnType<typeof setInterval> | undefined;

  startHold() {
    if (this.alertSent() || this.isSending()) return;
    this.isHolding.set(true);
    this.progress.set(0);
    
    const startTime = Date.now();
    const duration = 3000; // 3 seconds

    this.holdInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(elapsed / duration, 1);
      this.progress.set(p);

      if (p >= 1) {
        this.triggerAlert();
      }
    }, 50);
  }

  cancelHold() {
    this.isHolding.set(false);
    this.progress.set(0);
    clearInterval(this.holdInterval);
  }

  async triggerAlert() {
    this.cancelHold();
    this.isSending.set(true);
    
    const incidentPath = 'incidents';
    const mailPath = 'mail';
    const contactsPath = 'emergency_contacts';

    try {
      const user = this.authService.user();
      const profile = this.authService.profile();
      
      if (!user || !profile) {
        alert('Please sign in and wait for your profile to load before sending an emergency alert.');
        this.isSending.set(false);
        return;
      }

      // Get current location
      let location = { latitude: 0, longitude: 0 };
      try {
        const pos = await this.getCurrentPosition();
        location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } catch (locErr) {
        console.warn('Could not get location', locErr);
      }

      // 1. Check for active trip
      const tripsQuery = query(
        collection(getDb(), 'trips'),
        where('passengerId', '==', user.uid),
        where('status', '==', 'active')
      );
      const tripSnap = await getDocs(tripsQuery);
      let activeTrip: Trip | null = null;
      if (!tripSnap.empty) {
        activeTrip = { id: tripSnap.docs[0].id, ...tripSnap.docs[0].data() } as Trip;
      }

      // 2. Create Incident Report
      const incidentData: Partial<Incident> = {
        reporterId: user.uid,
        reporterName: profile.displayName || user.displayName || 'Anonymous',
        reporterEmail: user.email || profile.email || '',
        description: 'Emergency SOS triggered by passenger' + (activeTrip ? ` during trip ${activeTrip.id}` : ''),
        severity: 'high',
        status: 'open',
        timestamp: new Date().toISOString(),
        location: location
      };

      if (activeTrip) {
        incidentData.driverId = activeTrip.driverId;
        incidentData.tripId = activeTrip.id;
        incidentData.driverName = activeTrip.driverName || 'Unknown Driver';
      }

      await addDoc(collection(getDb(), incidentPath), incidentData);

      // 3. Fetch Emergency Contacts
      const q = query(collection(getDb(), contactsPath), where('userId', '==', user.uid));
      const contactsSnap = await getDocs(q);
      const contacts = contactsSnap.docs.map(d => d.data() as EmergencyContact);

      console.log(`Found ${contacts.length} emergency contacts for user ${user.uid}`);

      if (contacts.length === 0) {
        alert('You have no emergency contacts saved. Please add contacts in the Emergency Contacts page first.');
        this.isSending.set(false);
        return;
      }

      const validContacts = contacts.filter(c => c.email && c.email.includes('@'));
      if (validContacts.length === 0) {
        alert('None of your emergency contacts have a valid email address. Please update them in the Emergency Contacts page.');
        this.isSending.set(false);
        return;
      }

      const reporterName = profile.displayName || user.displayName || 'A SafeRide User';

      // 4. Send Email Notifications (via mail collection)
      const mailPromises = validContacts.map(contact => {
        console.log(`Queueing email for ${contact.email}`);
        const driverInfo = activeTrip ? `\n\nDriver Details:\nName: ${activeTrip.driverName || 'N/A'}\nDriver ID: ${activeTrip.driverId}\nTrip ID: ${activeTrip.id}` : '';
        const driverHtml = activeTrip ? `
          <div style="margin-top: 15px; padding: 15px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
            <p style="margin: 0; color: #64748b; font-size: 10px; font-weight: bold; text-transform: uppercase;">Active Trip Details</p>
            <p style="margin: 5px 0 0 0;"><strong>Driver:</strong> ${activeTrip.driverName || 'N/A'}</p>
            <p style="margin: 2px 0 0 0;"><strong>Trip ID:</strong> ${activeTrip.id}</p>
          </div>
        ` : '';

        return addDoc(collection(getDb(), mailPath), {
          to: contact.email,
          message: {
            subject: `EMERGENCY ALERT: ${reporterName} needs help!`,
            text: `This is an automated emergency alert from SafeRide. ${reporterName} has triggered an SOS. \n\nLocation: https://www.google.com/maps?q=${location.latitude},${location.longitude}${driverInfo} \n\nPlease check on them immediately.`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; border: 2px solid #ef4444; border-radius: 10px;">
                <h1 style="color: #ef4444;">EMERGENCY SOS ALERT</h1>
                <p><strong>${reporterName}</strong> has triggered an emergency alert.</p>
                <p><strong>Location:</strong> <a href="https://www.google.com/maps?q=${location.latitude},${location.longitude}">View on Google Maps</a></p>
                ${driverHtml}
                <p style="margin-top: 20px; font-size: 12px; color: #64748b;">This is an automated message from the SafeRide Safety System.</p>
              </div>
            `
          }
        }).catch(err => {
          console.error(`Failed to queue email to ${contact.email}:`, err);
          throw err;
        });
      });

      try {
        await Promise.all(mailPromises);
      } catch (mailErr) {
        handleFirestoreError(mailErr, OperationType.CREATE, mailPath);
        return;
      }

      this.alertSent.set(true);
      // Reset after 5 seconds
      setTimeout(() => {
        this.alertSent.set(false);
      }, 5000);

    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, incidentPath);
    } finally {
      this.isSending.set(false);
    }
  }

  private getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  }
}
