import {Component, inject, signal, OnInit} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {AuthService} from '../../../services/auth';
import {getDb} from '../../../firebase';
import {doc, setDoc, getDoc} from 'firebase/firestore';
import {User as FirebaseUser} from 'firebase/auth';
import {DriverProfile, Vehicle} from '../../../models/types';

@Component({
  selector: 'app-driver-register',
  imports: [RouterLink, MatIconModule, CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-50 flex flex-col">
      <!-- Header -->
      <header class="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-100 sticky top-0 z-10">
        <a routerLink="/driver/login" class="text-slate-600">
          <mat-icon>arrow_back</mat-icon>
        </a>
        <h1 class="font-bold text-lg">Driver Registration</h1>
        @if (authService.user()) {
          <button (click)="authService.logout()" class="text-slate-400 hover:text-danger transition-colors">
            <mat-icon>logout</mat-icon>
          </button>
        } @else {
          <div class="w-6"></div>
        }
      </header>

      <main class="flex-1 p-6 max-w-md mx-auto w-full">
        @if (checkingRegistration()) {
          <div class="flex flex-col items-center justify-center py-20">
            <div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Checking Status</p>
          </div>
        } @else {
          <div class="mb-8">
            <h2 class="text-2xl font-bold text-slate-900 mb-2">Join SafeRide</h2>
            <p class="text-slate-500">Step {{ currentStep() }} of 5: {{ stepTitles[currentStep() - 1] }}</p>
            
            <!-- Progress Bar -->
            <div class="flex gap-2 mt-4">
              @for (step of [1, 2, 3, 4, 5]; track step) {
                <div [class]="'h-1.5 flex-1 rounded-full transition-all ' + (currentStep() >= step ? 'bg-primary' : 'bg-slate-200')"></div>
              }
            </div>
          </div>

          <form (ngSubmit)="onSubmit()" #driverForm="ngForm" class="space-y-6">
            <!-- Step 1: Personal Information -->
            @if (currentStep() === 1) {
              <div class="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 class="text-xs font-black uppercase tracking-widest text-slate-400">Personal Information</h3>
                
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label for="firstName" class="block text-sm font-bold text-slate-700 mb-2">First Name</label>
                    <input type="text" id="firstName" name="firstName" [(ngModel)]="formData.firstName" required
                           class="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                  </div>
                  <div>
                    <label for="lastName" class="block text-sm font-bold text-slate-700 mb-2">Last Name</label>
                    <input type="text" id="lastName" name="lastName" [(ngModel)]="formData.lastName" required
                           class="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                  </div>
                </div>

                <div>
                  <label for="middleName" class="block text-sm font-bold text-slate-700 mb-2">Middle Name (Optional)</label>
                  <input type="text" id="middleName" name="middleName" [(ngModel)]="formData.middleName"
                         class="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label for="dob" class="block text-sm font-bold text-slate-700 mb-2">Date of Birth</label>
                    <input type="date" id="dob" name="dob" [(ngModel)]="formData.dob" required
                           class="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                  </div>
                  <div>
                    <label for="gender" class="block text-sm font-bold text-slate-700 mb-2">Gender</label>
                    <select id="gender" name="gender" [(ngModel)]="formData.gender" required
                            class="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label for="phoneNumber" class="block text-sm font-bold text-slate-700 mb-2">Phone Number</label>
                  <div class="flex gap-2">
                    <input type="tel" id="phoneNumber" name="phoneNumber" [(ngModel)]="formData.phoneNumber" required
                           class="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                    <button type="button" class="bg-slate-100 text-slate-600 px-4 rounded-2xl font-bold text-xs">Verify</button>
                  </div>
                </div>

                @if (!authService.user()) {
                  <div>
                    <label for="email" class="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                    <input type="email" id="email" name="email" [(ngModel)]="formData.email" required
                           class="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                  </div>
                  <div>
                    <label for="password" class="block text-sm font-bold text-slate-700 mb-2">Password</label>
                    <input type="password" id="password" name="password" [(ngModel)]="formData.password" required
                           class="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                  </div>
                }

                <div>
                  <label for="residentialAddress" class="block text-sm font-bold text-slate-700 mb-2">Residential Address</label>
                  <textarea id="residentialAddress" name="residentialAddress" [(ngModel)]="formData.residentialAddress" required
                            class="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-24"></textarea>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label for="stateCity" class="block text-sm font-bold text-slate-700 mb-2">State / City</label>
                    <input type="text" id="stateCity" name="stateCity" [(ngModel)]="formData.stateCity" required
                           class="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                  </div>
                  <div>
                    <label for="nationality" class="block text-sm font-bold text-slate-700 mb-2">Nationality</label>
                    <input type="text" id="nationality" name="nationality" [(ngModel)]="formData.nationality" required
                           class="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                  </div>
                </div>

                <div class="p-4 bg-slate-100 rounded-2xl flex flex-col items-center gap-3">
                  <div class="w-20 h-20 bg-white rounded-full flex items-center justify-center overflow-hidden border-2 border-primary/20 relative">
                    @if (uploading() === 'profile') {
                      <div class="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    }
                    @if (formData.profilePhotoUrl) {
                      <img [src]="formData.profilePhotoUrl" alt="Profile" class="w-full h-full object-cover" referrerpolicy="no-referrer">
                    } @else {
                      <mat-icon class="text-slate-300 text-4xl">person</mat-icon>
                    }
                  </div>
                  <input type="file" id="profileInput" class="hidden" accept="image/*" (change)="onFileSelected($event, 'profile')">
                  <div class="flex flex-col items-center gap-2">
                    <button type="button" (click)="triggerFileUpload('profileInput')" class="text-primary font-bold text-sm flex items-center gap-2">
                      <mat-icon>camera_alt</mat-icon> Select Profile Photo
                    </button>
                    <button type="button" (click)="setPlaceholderPhoto('profile')" class="text-[10px] text-slate-400 font-bold uppercase hover:text-slate-600 transition-colors">
                      Use Placeholder
                    </button>
                  </div>
                </div>

                <button type="button" (click)="handleStep1()" [disabled]="loading() || !formData.firstName || !formData.lastName || !formData.dob || !formData.gender || !formData.phoneNumber || !formData.residentialAddress || !formData.stateCity || !formData.nationality || !formData.profilePhotoUrl"
                        class="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50">
                  @if (loading()) {
                    <div class="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                  } @else {
                    Next: Identity Verification
                  }
                </button>
              </div>
            }

            <!-- Step 2: Identity Verification (KYC) -->
            @if (currentStep() === 2) {
              <div class="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 class="text-xs font-black uppercase tracking-widest text-slate-400">Identity Verification (KYC)</h3>
                
                <div>
                  <label for="nin" class="block text-sm font-bold text-slate-700 mb-2">National ID Number (NIN)</label>
                  <input type="text" id="nin" name="nin" [(ngModel)]="formData.nin" required
                         class="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                </div>

                <div>
                  <label for="idType" class="block text-sm font-bold text-slate-700 mb-2">ID Type</label>
                  <select id="idType" name="idType" [(ngModel)]="formData.idType" required
                          class="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                    <option value="National ID">National ID Card</option>
                    <option value="Voter Card">Voter’s Card</option>
                    <option value="Passport">International Passport</option>
                  </select>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label for="idNumber" class="block text-sm font-bold text-slate-700 mb-2">ID Number</label>
                    <input type="text" id="idNumber" name="idNumber" [(ngModel)]="formData.idNumber" required
                           class="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                  </div>
                  <div>
                    <label for="idExpiryDate" class="block text-sm font-bold text-slate-700 mb-2">Expiry Date</label>
                    <input type="date" id="idExpiryDate" name="idExpiryDate" [(ngModel)]="formData.idExpiryDate"
                           class="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                  </div>
                </div>                <div class="grid grid-cols-2 gap-4">
                  <input type="file" id="idFrontInput" class="hidden" accept="image/*" (change)="onFileSelected($event, 'idFront')">
                  <button type="button" (click)="triggerFileUpload('idFrontInput')" 
                       [class]="'relative bg-white border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors w-full min-h-[120px] ' + 
                                 (formData.idFrontPhotoUrl ? 'border-primary' : 'border-slate-200 hover:border-primary/50')">
                    @if (uploading() === 'idFront') {
                      <div class="absolute inset-0 bg-white/80 flex items-center justify-center rounded-2xl">
                        <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    }
                    @if (formData.idFrontPhotoUrl) {
                      <img [src]="formData.idFrontPhotoUrl" alt="ID Front" class="w-full h-20 object-cover rounded-lg mb-2" referrerpolicy="no-referrer">
                      <span class="text-[10px] font-bold text-primary uppercase">ID Front Uploaded</span>
                    } @else {
                      <mat-icon class="text-slate-400 mb-2">badge</mat-icon>
                      <span class="text-[10px] font-bold text-slate-500 uppercase">Select ID Front</span>
                    }
                  </button>

                  <input type="file" id="idBackInput" class="hidden" accept="image/*" (change)="onFileSelected($event, 'idBack')">
                  <button type="button" (click)="triggerFileUpload('idBackInput')" 
                       [class]="'relative bg-white border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors w-full min-h-[120px] ' + 
                                 (formData.idBackPhotoUrl ? 'border-primary' : 'border-slate-200 hover:border-primary/50')">
                    @if (uploading() === 'idBack') {
                      <div class="absolute inset-0 bg-white/80 flex items-center justify-center rounded-2xl">
                        <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    }
                    @if (formData.idBackPhotoUrl) {
                      <img [src]="formData.idBackPhotoUrl" alt="ID Back" class="w-full h-20 object-cover rounded-lg mb-2" referrerpolicy="no-referrer">
                      <span class="text-[10px] font-bold text-primary uppercase">ID Back Uploaded</span>
                    } @else {
                      <mat-icon class="text-slate-400 mb-2">badge</mat-icon>
                      <span class="text-[10px] font-bold text-slate-500 uppercase">Select ID Back</span>
                    }
                  </button>
                </div>
                <div class="flex justify-center">
                  <button type="button" (click)="setPlaceholderPhoto('idFront'); setPlaceholderPhoto('idBack')" class="text-[10px] text-slate-400 font-bold uppercase hover:text-slate-600">
                    Use Placeholders for IDs
                  </button>
                </div>
>

                <div class="flex gap-3">
                  <button type="button" (click)="prevStep()" class="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold">
                    Back
                  </button>
                  <button type="button" (click)="nextStep()" [disabled]="!formData.nin || !formData.idNumber || !formData.idFrontPhotoUrl"
                          class="flex-2 bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50">
                    Next: License Details
                  </button>
                </div>
              </div>
            }

            <!-- Step 3: Driver License Details -->
            @if (currentStep() === 3) {
              <div class="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 class="text-xs font-black uppercase tracking-widest text-slate-400">Driver License Details</h3>
                
                <div>
                  <label for="licenseNumber" class="block text-sm font-bold text-slate-700 mb-2">License Number</label>
                  <input type="text" id="licenseNumber" name="licenseNumber" [(ngModel)]="formData.licenseNumber" required
                         class="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all uppercase">
                </div>

                <div>
                  <label for="licenseIssuingAuthority" class="block text-sm font-bold text-slate-700 mb-2">Issuing Authority</label>
                  <input type="text" id="licenseIssuingAuthority" name="licenseIssuingAuthority" [(ngModel)]="formData.licenseIssuingAuthority" required
                         class="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label for="licenseIssueDate" class="block text-sm font-bold text-slate-700 mb-2">Issue Date</label>
                    <input type="date" id="licenseIssueDate" name="licenseIssueDate" [(ngModel)]="formData.licenseIssueDate" required
                           class="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                  </div>
                  <div>
                    <label for="licenseExpiryDate" class="block text-sm font-bold text-slate-700 mb-2">Expiry Date</label>
                    <input type="date" id="licenseExpiryDate" name="licenseExpiryDate" [(ngModel)]="formData.licenseExpiryDate" required
                           class="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                  </div>
                </div>

                <div>
                  <label for="licenseClass" class="block text-sm font-bold text-slate-700 mb-2">License Class</label>
                  <input type="text" id="licenseClass" name="licenseClass" [(ngModel)]="formData.licenseClass" required placeholder="e.g., B, C"
                         class="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                </div>                <div class="grid grid-cols-2 gap-4">
                  <input type="file" id="licenseFrontInput" class="hidden" accept="image/*" (change)="onFileSelected($event, 'licenseFront')">
                  <button type="button" (click)="triggerFileUpload('licenseFrontInput')" 
                       [class]="'relative bg-white border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors w-full min-h-[120px] ' + 
                                 (formData.licenseFrontPhotoUrl ? 'border-primary' : 'border-slate-200 hover:border-primary/50')">
                    @if (uploading() === 'licenseFront') {
                      <div class="absolute inset-0 bg-white/80 flex items-center justify-center rounded-2xl">
                        <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    }
                    @if (formData.licenseFrontPhotoUrl) {
                      <img [src]="formData.licenseFrontPhotoUrl" alt="License Front" class="w-full h-20 object-cover rounded-lg mb-2" referrerpolicy="no-referrer">
                      <span class="text-[10px] font-bold text-primary uppercase">License Front Uploaded</span>
                    } @else {
                      <mat-icon class="text-slate-400 mb-2">badge</mat-icon>
                      <span class="text-[10px] font-bold text-slate-500 uppercase">Select License Front</span>
                    }
                  </button>

                  <input type="file" id="licenseBackInput" class="hidden" accept="image/*" (change)="onFileSelected($event, 'licenseBack')">
                  <button type="button" (click)="triggerFileUpload('licenseBackInput')" 
                       [class]="'relative bg-white border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors w-full min-h-[120px] ' + 
                                 (formData.licenseBackPhotoUrl ? 'border-primary' : 'border-slate-200 hover:border-primary/50')">
                    @if (uploading() === 'licenseBack') {
                      <div class="absolute inset-0 bg-white/80 flex items-center justify-center rounded-2xl">
                        <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    }
                    @if (formData.licenseBackPhotoUrl) {
                      <img [src]="formData.licenseBackPhotoUrl" alt="License Back" class="w-full h-20 object-cover rounded-lg mb-2" referrerpolicy="no-referrer">
                      <span class="text-[10px] font-bold text-primary uppercase">License Back Uploaded</span>
                    } @else {
                      <mat-icon class="text-slate-400 mb-2">badge</mat-icon>
                      <span class="text-[10px] font-bold text-slate-500 uppercase">Select License Back</span>
                    }
                  </button>
                </div>
                <div class="flex justify-center">
                  <button type="button" (click)="setPlaceholderPhoto('licenseFront'); setPlaceholderPhoto('licenseBack')" class="text-[10px] text-slate-400 font-bold uppercase hover:text-slate-600">
                    Use Placeholders for License
                  </button>
                </div>
>

                <div class="flex gap-3">
                  <button type="button" (click)="prevStep()" class="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold">
                    Back
                  </button>
                  <button type="button" (click)="nextStep()" [disabled]="!formData.licenseNumber || !formData.licenseFrontPhotoUrl"
                          class="flex-2 bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50">
                    Next: Vehicle Info
                  </button>
                </div>
              </div>
            }

            <!-- Step 4: Vehicle Information -->
            @if (currentStep() === 4) {
              <div class="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 class="text-xs font-black uppercase tracking-widest text-slate-400">Vehicle Information</h3>
                
                <div>
                  <label for="vehicleOwnerName" class="block text-sm font-bold text-slate-700 mb-2">Vehicle Owner Name (if different)</label>
                  <input type="text" id="vehicleOwnerName" name="vehicleOwnerName" [(ngModel)]="formData.vehicleOwnerName"
                         class="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label for="plateNumber" class="block text-sm font-bold text-slate-700 mb-2">Plate Number</label>
                    <input type="text" id="plateNumber" name="plateNumber" [(ngModel)]="formData.plateNumber" required
                           class="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all uppercase">
                  </div>
                  <div>
                    <label for="year" class="block text-sm font-bold text-slate-700 mb-2">Year</label>
                    <input type="text" id="year" name="year" [(ngModel)]="formData.year" required
                           class="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label for="make" class="block text-sm font-bold text-slate-700 mb-2">Make</label>
                    <input type="text" id="make" name="make" [(ngModel)]="formData.make" required placeholder="e.g., Toyota"
                           class="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                  </div>
                  <div>
                    <label for="model" class="block text-sm font-bold text-slate-700 mb-2">Model</label>
                    <input type="text" id="model" name="model" [(ngModel)]="formData.model" required placeholder="e.g., Corolla"
                           class="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                  </div>
                </div>

                <div>
                  <label for="color" class="block text-sm font-bold text-slate-700 mb-2">Color</label>
                  <input type="text" id="color" name="color" [(ngModel)]="formData.color" required
                         class="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label for="engineNumber" class="block text-sm font-bold text-slate-700 mb-2">Engine Number (Opt)</label>
                    <input type="text" id="engineNumber" name="engineNumber" [(ngModel)]="formData.engineNumber"
                           class="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                  </div>
                  <div>
                    <label for="chassisNumber" class="block text-sm font-bold text-slate-700 mb-2">Chassis Number (Opt)</label>
                    <input type="text" id="chassisNumber" name="chassisNumber" [(ngModel)]="formData.chassisNumber"
                           class="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                  </div>
                </div>

                <div class="flex gap-3">
                  <button type="button" (click)="prevStep()" class="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold">
                    Back
                  </button>
                  <button type="button" (click)="nextStep()" [disabled]="!formData.plateNumber || !formData.make || !formData.model"
                          class="flex-2 bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50">
                    Next: Vehicle Docs
                  </button>
                </div>
              </div>
            }

            <!-- Step 5: Vehicle Documents -->
            @if (currentStep() === 5) {
              <div class="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 class="text-xs font-black uppercase tracking-widest text-slate-400">Vehicle Documents</h3>
                
                <div class="grid grid-cols-1 gap-4">
                  <input type="file" id="regCertInput" class="hidden" accept="image/*" (change)="onFileSelected($event, 'regCert')">
                  <button type="button" (click)="triggerFileUpload('regCertInput')" 
                       [class]="'relative bg-white border-2 border-dashed rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-colors w-full ' + 
                                 (formData.vehicleRegistrationUrl ? 'border-primary' : 'border-slate-200 hover:border-primary/50')">
                    @if (uploading() === 'regCert') {
                      <div class="absolute inset-0 bg-white/80 flex items-center justify-center rounded-2xl z-10">
                        <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    }
                    <div class="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                      <mat-icon>description</mat-icon>
                    </div>
                    <div class="text-left">
                      <span class="block text-xs font-bold text-slate-700">Registration Certificate</span>
                      <span class="text-[10px] text-slate-400 uppercase font-bold">{{ formData.vehicleRegistrationUrl ? 'Uploaded' : 'Select File' }}</span>
                    </div>
                  </button>

                  <input type="file" id="proofOwnershipInput" class="hidden" accept="image/*" (change)="onFileSelected($event, 'proofOwnership')">
                  <button type="button" (click)="triggerFileUpload('proofOwnershipInput')" 
                       [class]="'relative bg-white border-2 border-dashed rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-colors w-full ' + 
                                 (formData.proofOfOwnershipUrl ? 'border-primary' : 'border-slate-200 hover:border-primary/50')">
                    @if (uploading() === 'proofOwnership') {
                      <div class="absolute inset-0 bg-white/80 flex items-center justify-center rounded-2xl z-10">
                        <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    }
                    <div class="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                      <mat-icon>assignment_ind</mat-icon>
                    </div>
                    <div class="text-left">
                      <span class="block text-xs font-bold text-slate-700">Proof of Ownership</span>
                      <span class="text-[10px] text-slate-400 uppercase font-bold">{{ formData.proofOfOwnershipUrl ? 'Uploaded' : 'Select File' }}</span>
                    </div>
                  </button>

                  <input type="file" id="roadWorthinessInput" class="hidden" accept="image/*" (change)="onFileSelected($event, 'roadWorthiness')">
                  <button type="button" (click)="triggerFileUpload('roadWorthinessInput')" 
                       [class]="'relative bg-white border-2 border-dashed rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-colors w-full ' + 
                                 (formData.roadWorthinessUrl ? 'border-primary' : 'border-slate-200 hover:border-primary/50')">
                    @if (uploading() === 'roadWorthiness') {
                      <div class="absolute inset-0 bg-white/80 flex items-center justify-center rounded-2xl z-10">
                        <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    }
                    <div class="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                      <mat-icon>verified</mat-icon>
                    </div>
                    <div class="text-left">
                      <span class="block text-xs font-bold text-slate-700">Road Worthiness Certificate</span>
                      <span class="text-[10px] text-slate-400 uppercase font-bold">{{ formData.roadWorthinessUrl ? 'Uploaded' : 'Select File' }}</span>
                    </div>
                  </button>

                  <input type="file" id="insuranceInput" class="hidden" accept="image/*" (change)="onFileSelected($event, 'insurance')">
                  <button type="button" (click)="triggerFileUpload('insuranceInput')" 
                       [class]="'relative bg-white border-2 border-dashed rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-colors w-full ' + 
                                 (formData.insuranceUrl ? 'border-primary' : 'border-slate-200 hover:border-primary/50')">
                    @if (uploading() === 'insurance') {
                      <div class="absolute inset-0 bg-white/80 flex items-center justify-center rounded-2xl z-10">
                        <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    }
                    <div class="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                      <mat-icon>security</mat-icon>
                    </div>
                    <div class="text-left">
                      <span class="block text-xs font-bold text-slate-700">Insurance Certificate</span>
                      <span class="text-[10px] text-slate-400 uppercase font-bold">{{ formData.insuranceUrl ? 'Uploaded' : 'Select File' }}</span>
                    </div>
                  </button>
                </div>

                <div class="flex justify-center">
                  <button type="button" (click)="setPlaceholderPhoto('regCert'); setPlaceholderPhoto('proofOwnership'); setPlaceholderPhoto('roadWorthiness'); setPlaceholderPhoto('insurance')" class="text-[10px] text-slate-400 font-bold uppercase hover:text-slate-600">
                    Use Placeholders for Vehicle Docs
                  </button>
                </div>

                <div class="flex gap-3">
                  <button type="button" (click)="prevStep()" class="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold">
                    Back
                  </button>
                  <button type="submit" [disabled]="loading() || !formData.vehicleRegistrationUrl || !formData.proofOfOwnershipUrl" 
                          class="flex-2 bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50">
                    @if (loading()) {
                      <div class="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                    } @else {
                      Complete Registration
                    }
                  </button>
                </div>
              </div>
            }
          </form>
        }

        <p class="mt-8 text-center text-xs text-slate-400 leading-relaxed">
          By submitting, you agree to SafeRide's Terms of Service and Privacy Policy. Your data will be used for verification purposes only.
        </p>
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class DriverRegister implements OnInit {
  authService = inject(AuthService);
  router = inject(Router);
  loading = signal(false);
  checkingRegistration = signal(true);
  currentStep = signal(1);
  stepTitles = [
    'Personal Information',
    'Identity Verification (KYC)',
    'Driver License Details',
    'Vehicle Information',
    'Vehicle Documents'
  ];

  formData = {
    // Account (Step 0/1)
    email: '',
    password: '',
    
    // Step 1: Personal
    firstName: '',
    middleName: '',
    lastName: '',
    dob: '',
    gender: '',
    phoneNumber: '',
    residentialAddress: '',
    stateCity: '',
    nationality: 'Nigerian',
    profilePhotoUrl: '',

    // Step 2: KYC
    nin: '',
    idType: 'National ID' as 'National ID' | 'Voter Card' | 'Passport',
    idNumber: '',
    idExpiryDate: '',
    idFrontPhotoUrl: '',
    idBackPhotoUrl: '',

    // Step 3: License
    licenseNumber: '',
    licenseIssuingAuthority: '',
    licenseIssueDate: '',
    licenseExpiryDate: '',
    licenseClass: '',
    licenseFrontPhotoUrl: '',
    licenseBackPhotoUrl: '',

    // Step 4: Vehicle Info
    vehicleOwnerName: '',
    plateNumber: '',
    make: '',
    model: '',
    year: '',
    color: '',
    engineNumber: '',
    chassisNumber: '',

    // Step 5: Vehicle Docs
    vehicleRegistrationUrl: '',
    proofOfOwnershipUrl: '',
    roadWorthinessUrl: '',
    insuranceUrl: ''
  };

  async ngOnInit() {
    const user = this.authService.user();
    if (user) {
      try {
        const docSnap = await getDoc(doc(getDb(), 'drivers', user.uid));
        if (docSnap.exists()) {
          // Already registered, go to dashboard
          this.router.navigate(['/driver/dashboard']);
        } else {
          // Logged in but no profile, start at Step 1 but skip account creation fields
          this.currentStep.set(1);
          if (user.displayName) {
            const names = user.displayName.split(' ');
            this.formData.firstName = names[0] || '';
            this.formData.lastName = names[names.length - 1] || '';
            if (names.length > 2) {
              this.formData.middleName = names.slice(1, -1).join(' ');
            }
          }
          this.formData.email = user.email || '';
        }
      } catch (err) {
        console.error('Failed to check driver registration:', err);
      } finally {
        this.checkingRegistration.set(false);
      }
    } else {
      // Not logged in, start at Step 1
      this.currentStep.set(1);
      this.checkingRegistration.set(false);
    }
  }

  async handleStep1() {
    // If not logged in, create account first
    if (!this.authService.user()) {
      if (!this.formData.email || !this.formData.password) return;
      
      this.loading.set(true);
      try {
        const displayName = `${this.formData.firstName} ${this.formData.middleName ? this.formData.middleName + ' ' : ''}${this.formData.lastName}`.trim();
        await this.authService.registerWithEmail(
          this.formData.email, 
          this.formData.password, 
          displayName, 
          'driver'
        );
        this.nextStep();
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Account creation failed');
      } finally {
        this.loading.set(false);
      }
    } else {
      // Already logged in, just move to next step
      this.nextStep();
    }
  }

  async loginWithGoogle() {
    this.loading.set(true);
    try {
      const profile = await this.authService.loginWithGoogle();
      if (profile) {
        if (profile.role !== 'driver' && profile.role !== 'admin') {
          alert('This account is not registered as a driver.');
          await this.authService.logout();
          return;
        }
        // Check if profile exists in drivers collection
        const docSnap = await getDoc(doc(getDb(), 'drivers', this.authService.user()!.uid));
        if (docSnap.exists()) {
          this.router.navigate(['/driver/dashboard']);
        } else {
          this.currentStep.set(1);
          const user = this.authService.user();
          if (user?.displayName) {
            const names = user.displayName.split(' ');
            this.formData.firstName = names[0] || '';
            this.formData.lastName = names[names.length - 1] || '';
          }
        }
      }
    } catch {
      alert('Google login failed');
    } finally {
      this.loading.set(false);
    }
  }

  nextStep() {
    if (this.currentStep() < 5) {
      this.currentStep.update(s => s + 1);
      window.scrollTo(0, 0);
    }
  }

  prevStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
      window.scrollTo(0, 0);
    }
  }

  uploading = signal<string | null>(null);

  onFileSelected(event: Event, type: string) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Basic type check
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (PNG, JPG, etc)');
        return;
      }

      this.uploading.set(type);

      const reader = new FileReader();
      reader.onload = () => {
        // Simulate a delay for the "upload"
        setTimeout(() => {
          const result = reader.result as string;
          this.setPhotoUrl(type, result);
          this.uploading.set(null);
        }, 1500);
      };
      reader.readAsDataURL(file);
    }
  }

  private setPhotoUrl(type: string, url: string) {
    switch (type) {
      case 'profile': this.formData.profilePhotoUrl = url; break;
      case 'idFront': this.formData.idFrontPhotoUrl = url; break;
      case 'idBack': this.formData.idBackPhotoUrl = url; break;
      case 'licenseFront': this.formData.licenseFrontPhotoUrl = url; break;
      case 'licenseBack': this.formData.licenseBackPhotoUrl = url; break;
      case 'regCert': this.formData.vehicleRegistrationUrl = url; break;
      case 'proofOwnership': this.formData.proofOfOwnershipUrl = url; break;
      case 'roadWorthiness': this.formData.roadWorthinessUrl = url; break;
      case 'insurance': this.formData.insuranceUrl = url; break;
    }
  }

  triggerFileUpload(inputId: string) {
    document.getElementById(inputId)?.click();
  }

  setPlaceholderPhoto(type: string) {
    const random = Math.random().toString(36).substring(7);
    const url = `https://picsum.photos/seed/${random}/400/300`;
    
    switch (type) {
      case 'profile': this.formData.profilePhotoUrl = url; break;
      case 'idFront': this.formData.idFrontPhotoUrl = url; break;
      case 'idBack': this.formData.idBackPhotoUrl = url; break;
      case 'licenseFront': this.formData.licenseFrontPhotoUrl = url; break;
      case 'licenseBack': this.formData.licenseBackPhotoUrl = url; break;
      case 'regCert': this.formData.vehicleRegistrationUrl = url; break;
      case 'proofOwnership': this.formData.proofOfOwnershipUrl = url; break;
      case 'roadWorthiness': this.formData.roadWorthinessUrl = url; break;
      case 'insurance': this.formData.insuranceUrl = url; break;
    }
  }

  async onSubmit() {
    const user = this.authService.user() as FirebaseUser | null;
    if (!user) {
      alert('You must be logged in to complete registration.');
      return;
    }

    this.loading.set(true);
    try {
      const vehicleId = `veh_${Math.random().toString(36).substring(2, 9)}`;
      
      // Create vehicle
      const vehicle: Vehicle = {
        id: vehicleId,
        driverId: user.uid,
        plateNumber: this.formData.plateNumber,
        make: this.formData.make,
        model: this.formData.model,
        year: this.formData.year,
        color: this.formData.color,
        ownerName: this.formData.vehicleOwnerName || `${this.formData.firstName} ${this.formData.lastName}`,
        engineNumber: this.formData.engineNumber,
        chassisNumber: this.formData.chassisNumber
      };
      await setDoc(doc(getDb(), 'vehicles', vehicleId), vehicle);

      // Create driver profile
      const displayName = `${this.formData.firstName} ${this.formData.middleName ? this.formData.middleName + ' ' : ''}${this.formData.lastName}`.trim();
      const driver: DriverProfile = {
        uid: user.uid,
        email: user.email || this.formData.email,
        displayName: displayName,
        role: 'driver',
        phoneNumber: this.formData.phoneNumber,
        verificationStatus: 'pending',
        vehicleId: vehicleId,
        createdAt: new Date().toISOString(),
        
        // Personal Info
        firstName: this.formData.firstName,
        middleName: this.formData.middleName,
        lastName: this.formData.lastName,
        dob: this.formData.dob,
        gender: this.formData.gender,
        residentialAddress: this.formData.residentialAddress,
        stateCity: this.formData.stateCity,
        nationality: this.formData.nationality,
        profilePhotoUrl: this.formData.profilePhotoUrl,

        // KYC
        nin: this.formData.nin,
        idType: this.formData.idType,
        idNumber: this.formData.idNumber,
        idExpiryDate: this.formData.idExpiryDate,
        idFrontPhotoUrl: this.formData.idFrontPhotoUrl,
        idBackPhotoUrl: this.formData.idBackPhotoUrl,

        // License
        licenseNumber: this.formData.licenseNumber,
        licenseIssuingAuthority: this.formData.licenseIssuingAuthority,
        licenseIssueDate: this.formData.licenseIssueDate,
        licenseExpiryDate: this.formData.licenseExpiryDate,
        licenseClass: this.formData.licenseClass,
        licenseFrontPhotoUrl: this.formData.licenseFrontPhotoUrl,
        licenseBackPhotoUrl: this.formData.licenseBackPhotoUrl,

        // Vehicle (Flattened)
        plateNumber: this.formData.plateNumber,
        model: this.formData.model,
        make: this.formData.make,
        color: this.formData.color,
        year: this.formData.year,
        
        // Document URLs
        vehicleRegistrationUrl: this.formData.vehicleRegistrationUrl,
        proofOfOwnershipUrl: this.formData.proofOfOwnershipUrl,
        roadWorthinessUrl: this.formData.roadWorthinessUrl,
        insuranceUrl: this.formData.insuranceUrl
      };
      await setDoc(doc(getDb(), 'drivers', user.uid), driver);

      this.router.navigate(['/driver/dashboard']);
    } catch (error) {
      console.error('Registration failed', error);
      alert('Registration failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      this.loading.set(false);
    }
  }
}
