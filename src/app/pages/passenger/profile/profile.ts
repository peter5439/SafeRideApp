import {Component, inject, signal, OnInit} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {AuthService} from '../../../services/auth';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators} from '@angular/forms';
import {getDb} from '../../../firebase';
import {doc, updateDoc} from 'firebase/firestore';
import {UserProfile} from '../../../models/types';

@Component({
  selector: 'app-passenger-profile',
  imports: [RouterLink, MatIconModule, CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-slate-50 flex flex-col">
      <!-- Header -->
      <header class="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <a routerLink="/passenger/home" class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
          <mat-icon>arrow_back</mat-icon>
        </a>
        <h1 class="text-xl font-bold text-slate-900">My Profile</h1>
      </header>

      <main class="flex-1 p-6 max-w-md mx-auto w-full">
        <!-- Verification Status Card -->
        <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-8">
          <div class="flex items-center gap-4 mb-6">
            <div class="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              @if (profileImageUrl()) {
                <img [src]="profileImageUrl()" class="w-full h-full object-cover rounded-2xl" alt="Profile">
              } @else {
                <mat-icon class="text-3xl">person</mat-icon>
              }
            </div>
            <div>
              <h2 class="font-bold text-lg text-slate-900">{{ authService.profile()?.displayName }}</h2>
              <div [class]="'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ' + getStatusClass()">
                <mat-icon class="text-[14px] w-[14px] h-[14px]">{{ getStatusIcon() }}</mat-icon>
                {{ (authService.profile()?.verificationStatus || 'unverified') }}
              </div>
            </div>
          </div>

          @if (authService.profile()?.rejectionReason) {
            <div class="p-4 bg-danger/10 border border-danger/20 rounded-2xl mb-6">
              <p class="text-xs text-danger font-bold mb-1">Rejection Reason:</p>
              <p class="text-xs text-danger/80">{{ authService.profile()?.rejectionReason }}</p>
            </div>
          }

          <p class="text-sm text-slate-500 leading-relaxed italic">
            Complete your profile verification to enjoy full safety benefits and faster assistance.
          </p>
        </div>

        <!-- Verification Form -->
        <form [formGroup]="profileForm" (ngSubmit)="onSubmit()" class="space-y-6">
          <div class="space-y-2">
            <label for="phone-number" class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Phone Number</label>
            <div class="relative">
              <mat-icon class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">phone</mat-icon>
              <input id="phone-number" type="tel" formControlName="phoneNumber" placeholder="e.g. +234 812 345 6789" 
                     class="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm">
            </div>
          </div>

          <div class="space-y-2">
            <label for="national-id" class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">National ID Number (NIN)</label>
            <div class="relative">
              <mat-icon class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">fingerprint</mat-icon>
              <input id="national-id" type="text" formControlName="nationalId" placeholder="Enter your NIN" 
                     class="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm">
            </div>
          </div>

          <!-- Image Uploads -->
          <div class="space-y-4">
            <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Identity Documents</p>
            
            <!-- Profile Photo -->
            <div class="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-6 text-center group hover:border-primary transition-colors relative">
              <label for="profile-photo" class="absolute inset-0 cursor-pointer z-10">
                <span class="sr-only">Upload Profile Photo</span>
              </label>
              <input id="profile-photo" type="file" (change)="onFileSelected($event, 'profile')" class="absolute inset-0 opacity-0 cursor-pointer" accept="image/*">
              @if (profileImageUrl()) {
                <img [src]="profileImageUrl()" class="w-20 h-20 mx-auto rounded-xl object-cover mb-2" alt="Profile">
                <p class="text-[10px] font-bold text-primary">Change Profile Photo</p>
              } @else {
                <mat-icon class="text-3xl text-slate-300 mb-2 group-hover:text-primary transition-colors">account_circle</mat-icon>
                <p class="text-xs font-bold text-slate-500">Upload Profile Photo</p>
                <p class="text-[10px] text-slate-400">Help drivers identify you</p>
              }
            </div>

            <!-- ID Front -->
            <div class="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-6 text-center group hover:border-primary transition-colors relative">
              <label for="id-front" class="absolute inset-0 cursor-pointer z-10">
                <span class="sr-only">Upload ID Front</span>
              </label>
              <input id="id-front" type="file" (change)="onFileSelected($event, 'idFront')" class="absolute inset-0 opacity-0 cursor-pointer" accept="image/*">
              @if (idFrontImageUrl()) {
                <img [src]="idFrontImageUrl()" class="h-24 mx-auto rounded-lg object-contain mb-2" alt="ID Front">
                <p class="text-[10px] font-bold text-primary">Change ID Front</p>
              } @else {
                <mat-icon class="text-3xl text-slate-300 mb-2 group-hover:text-primary transition-colors">badge</mat-icon>
                <p class="text-xs font-bold text-slate-500">National ID Front View</p>
                <p class="text-[10px] text-slate-400">Clear photo showing details</p>
              }
            </div>

            <!-- ID Back -->
            <div class="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-6 text-center group hover:border-primary transition-colors relative">
              <label for="id-back" class="absolute inset-0 cursor-pointer z-10">
                <span class="sr-only">Upload ID Back</span>
              </label>
              <input id="id-back" type="file" (change)="onFileSelected($event, 'idBack')" class="absolute inset-0 opacity-0 cursor-pointer" accept="image/*">
              @if (idBackImageUrl()) {
                <img [src]="idBackImageUrl()" class="h-24 mx-auto rounded-lg object-contain mb-2" alt="ID Back">
                <p class="text-[10px] font-bold text-primary">Change ID Back</p>
              } @else {
                <mat-icon class="text-3xl text-slate-300 mb-2 group-hover:text-primary transition-colors">badge</mat-icon>
                <p class="text-xs font-bold text-slate-500">National ID Back View</p>
                <p class="text-[10px] text-slate-400">Reverse side of ID</p>
              }
            </div>
          </div>

          <button type="submit" 
                  [disabled]="loading() || profileForm.invalid || !idFrontImageUrl() || (authService.profile()?.verificationStatus === 'pending' && !profileForm.dirty)"
                  class="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-xl shadow-primary/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2">
            @if (loading()) {
              <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Saving...
            } @else {
              <mat-icon>check_circle</mat-icon>
              {{ (authService.profile()?.verificationStatus === 'pending' ? 'Update & Resubmit' : 'Submit for Verification') }}
            }
          </button>
        </form>

        <div class="mt-12 text-center pb-8 border-t border-slate-200 pt-8">
           <p class="text-xs text-slate-400">SafeRide Verification System &copy; 2026</p>
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class PassengerProfile implements OnInit {
  fb = inject(FormBuilder);
  authService = inject(AuthService);
  
  profileForm: FormGroup;
  loading = signal(false);

  profileImageUrl = signal<string>('');
  idFrontImageUrl = signal<string>('');
  idBackImageUrl = signal<string>('');

  constructor() {
    this.profileForm = this.fb.group({
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[+]?[0-9]{10,15}$/)]],
      nationalId: ['', [Validators.required, Validators.minLength(5)]]
    });
  }

  ngOnInit() {
    const profile = this.authService.profile();
    if (profile) {
      this.profileForm.patchValue({
        phoneNumber: profile.phoneNumber || '',
        nationalId: profile.nationalId || ''
      });
      if (profile.profileImageUrl) this.profileImageUrl.set(profile.profileImageUrl);
      if (profile.idFrontImageUrl) this.idFrontImageUrl.set(profile.idFrontImageUrl);
      if (profile.idBackImageUrl) this.idBackImageUrl.set(profile.idBackImageUrl);
    }
  }

  getStatusClass() {
    const status = this.authService.profile()?.verificationStatus || 'unverified';
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'rejected': return 'bg-danger/10 text-danger';
      default: return 'bg-slate-100 text-slate-700';
    }
  }

  getStatusIcon() {
    const status = this.authService.profile()?.verificationStatus || 'unverified';
    switch (status) {
      case 'verified': return 'verified';
      case 'pending': return 'schedule';
      case 'rejected': return 'cancel';
      default: return 'help_outline';
    }
  }

  async onFileSelected(event: Event, type: 'profile' | 'idFront' | 'idBack') {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('File too large. Max size 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const dataUrl = e.target?.result as string;
      if (type === 'profile') this.profileImageUrl.set(dataUrl);
      if (type === 'idFront') this.idFrontImageUrl.set(dataUrl);
      if (type === 'idBack') this.idBackImageUrl.set(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  async onSubmit() {
    if (this.profileForm.invalid) return;
    
    const user = this.authService.user();
    if (!user) return;

    this.loading.set(true);
    try {
      const updateData: Partial<UserProfile> = {
        phoneNumber: this.profileForm.get('phoneNumber')?.value,
        nationalId: this.profileForm.get('nationalId')?.value,
        profileImageUrl: this.profileImageUrl(),
        idFrontImageUrl: this.idFrontImageUrl(),
        idBackImageUrl: this.idBackImageUrl(),
        verificationStatus: 'pending'
      };

      await updateDoc(doc(getDb(), 'passengers', user.uid), updateData as Record<string, unknown>);
      alert('Profile submitted for verification!');
      
      // Refresh local profile
      await this.authService.checkAuth();
    } catch (error) {
      console.error('Failed to update profile', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
