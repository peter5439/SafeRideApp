import {Component, inject, signal, OnInit} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {AuthService} from '../../../services/auth';
import {getDb, handleFirestoreError, OperationType} from '../../../firebase';
import {doc, getDoc, updateDoc} from 'firebase/firestore';
import {DriverProfile as IDriverProfile} from '../../../models/types';

@Component({
  selector: 'app-driver-profile',
  imports: [RouterLink, MatIconModule, CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-50 flex flex-col">
      <!-- Header -->
      <header class="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-100">
        <a routerLink="/driver/dashboard" class="text-slate-600">
          <mat-icon>arrow_back</mat-icon>
        </a>
        <h1 class="font-bold text-lg">My Profile</h1>
        <div class="w-6"></div>
      </header>

      <main class="flex-1 p-6 max-w-md mx-auto w-full">
        @if (loading()) {
          <div class="flex flex-col items-center justify-center py-20">
            <div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Loading Profile</p>
          </div>
        } @else {
          <!-- Profile Header -->
          <div class="flex flex-col items-center text-center mb-10">
            <div class="relative mb-4">
              <img [src]="driverData()?.profilePhotoUrl || authService.user()?.photoURL || 'https://picsum.photos/seed/driver/200/200'" 
                   class="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md" 
                   referrerpolicy="no-referrer" alt="Driver Profile">
              <div class="absolute bottom-0 right-0 bg-primary text-white rounded-full p-2 border-2 border-white shadow-sm">
                <mat-icon class="text-sm">verified</mat-icon>
              </div>
            </div>
            <h2 class="text-2xl font-bold text-slate-900">{{ driverData()?.displayName || authService.profile()?.displayName }}</h2>
            <p [class]="'mt-2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-block ' + 
              (driverData()?.verificationStatus === 'verified' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')">
              {{ driverData()?.verificationStatus }}
            </p>
          </div>

          <!-- Details List -->
          <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
            <button (click)="openEditModal('Personal Information')" class="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left">
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                  <mat-icon>person</mat-icon>
                </div>
                <div>
                  <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Personal Details</p>
                  <p class="text-sm font-bold text-slate-700">{{ driverData()?.firstName }} {{ driverData()?.lastName }}</p>
                </div>
              </div>
              <mat-icon class="text-slate-300">chevron_right</mat-icon>
            </button>

            <button (click)="openEditModal('Contact Information')" class="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left">
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                  <mat-icon>phone</mat-icon>
                </div>
                <div>
                  <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Phone Number</p>
                  <p class="text-sm font-bold text-slate-700">{{ driverData()?.phoneNumber || 'Not provided' }}</p>
                </div>
              </div>
              <mat-icon class="text-slate-300">chevron_right</mat-icon>
            </button>

            <div class="p-5 flex items-center justify-between opacity-60">
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                  <mat-icon>badge</mat-icon>
                </div>
                <div>
                  <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">License Number (Locked)</p>
                  <p class="text-sm font-bold text-slate-700">{{ driverData()?.licenseNumber || 'Not provided' }}</p>
                </div>
              </div>
              <mat-icon class="text-slate-300">lock</mat-icon>
            </div>

            <div class="p-5 flex items-center justify-between opacity-60">
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                  <mat-icon>directions_car</mat-icon>
                </div>
                <div>
                  <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle Info (Locked)</p>
                  <p class="text-sm font-bold text-slate-700">
                    {{ driverData()?.model }} ({{ driverData()?.plateNumber }})
                  </p>
                </div>
              </div>
              <mat-icon class="text-slate-300">lock</mat-icon>
            </div>
          </div>

          <div class="mt-10 space-y-4">
            <button (click)="authService.logout()" class="w-full bg-danger/5 text-danger py-4 rounded-2xl font-bold flex items-center justify-center gap-2">
              <mat-icon>logout</mat-icon> Logout
            </button>
          </div>
        }
      </main>
    </div>

    <!-- Edit Modal -->
    @if (showEditModal()) {
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end z-50">
        <div class="bg-white w-full rounded-t-[40px] p-8 pb-12 animate-slide-up max-h-[90vh] overflow-y-auto">
          <div class="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8"></div>
          <h2 class="text-2xl font-bold mb-6">Edit {{ editSection() }}</h2>
          
          <div class="space-y-6">
            @if (editSection() === 'Personal Information') {
              <div class="space-y-4">
                <div>
                  <label for="firstName" class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">First Name</label>
                  <input id="firstName" name="firstName" [(ngModel)]="editData.firstName" type="text" class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20">
                </div>
                <div>
                  <label for="lastName" class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Last Name</label>
                  <input id="lastName" name="lastName" [(ngModel)]="editData.lastName" type="text" class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20">
                </div>
                <div>
                  <label for="residentialAddress" class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Residential Address</label>
                  <input id="residentialAddress" name="residentialAddress" [(ngModel)]="editData.residentialAddress" type="text" class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20">
                </div>
              </div>
            } @else if (editSection() === 'Contact Information') {
              <div>
                <label for="phoneNumber" class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Phone Number</label>
                <input id="phoneNumber" name="phoneNumber" [(ngModel)]="editData.phoneNumber" type="tel" class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20">
              </div>
            }

            <div class="flex flex-col gap-3 pt-4">
              <button (click)="saveChanges()" [disabled]="saving()" class="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                @if (saving()) {
                  <div class="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                } @else {
                  Save Changes
                }
              </button>
              <button (click)="showEditModal.set(false)" class="w-full bg-slate-100 text-slate-900 py-4 rounded-2xl font-bold">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes slide-up {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    .animate-slide-up {
      animation: slide-up 0.3s ease-out;
    }
  `]
})
export class DriverProfile implements OnInit {
  authService = inject(AuthService);
  driverData = signal<IDriverProfile | null>(null);
  loading = signal(true);
  saving = signal(false);
  
  showEditModal = signal(false);
  editSection = signal('');
  editData: Partial<IDriverProfile> = {};

  async ngOnInit() {
    const user = this.authService.user();
    if (user) {
      await this.loadProfile(user.uid);
    } else {
      this.loading.set(false);
    }
  }

  async loadProfile(uid: string) {
    try {
      const docSnap = await getDoc(doc(getDb(), 'drivers', uid));
      if (docSnap.exists()) {
        this.driverData.set(docSnap.data() as IDriverProfile);
      }
    } catch (err) {
      console.error('Failed to fetch driver profile:', err);
    } finally {
      this.loading.set(false);
    }
  }

  openEditModal(section: string) {
    const data = this.driverData();
    if (!data) return;

    this.editSection.set(section);
    this.editData = { ...data };
    this.showEditModal.set(true);
  }

  async saveChanges() {
    const user = this.authService.user();
    if (!user) return;

    this.saving.set(true);
    try {
      const updates: Partial<IDriverProfile> = {};
      
      if (this.editSection() === 'Personal Information') {
        updates.firstName = this.editData.firstName;
        updates.lastName = this.editData.lastName;
        updates.residentialAddress = this.editData.residentialAddress;
        updates.displayName = `${updates.firstName} ${updates.lastName}`;
      } else if (this.editSection() === 'Contact Information') {
        updates.phoneNumber = this.editData.phoneNumber;
      }

      await updateDoc(doc(getDb(), 'drivers', user.uid), updates);
      
      // Update local state
      this.driverData.update(prev => prev ? { ...prev, ...updates } : null);
      
      this.showEditModal.set(false);
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Failed to update profile:', err);
      handleFirestoreError(err, OperationType.UPDATE, `drivers/${user.uid}`);
      alert('Failed to update profile. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }
}
