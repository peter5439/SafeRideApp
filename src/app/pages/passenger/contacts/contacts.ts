import {Component, signal, inject, effect} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {getDb, handleFirestoreError, OperationType} from '../../../firebase';
import {collection, query, where, onSnapshot, addDoc, deleteDoc, doc, Unsubscribe} from 'firebase/firestore';
import {EmergencyContact} from '../../../models/types';
import {AuthService} from '../../../services/auth';

@Component({
  selector: 'app-passenger-contacts',
  imports: [RouterLink, MatIconModule, CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-50 flex flex-col">
      <!-- Header -->
      <header class="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-100 sticky top-0 z-10">
        <a routerLink="/passenger/home" class="text-slate-600">
          <mat-icon>arrow_back</mat-icon>
        </a>
        <h1 class="font-bold text-lg">Emergency Contacts</h1>
        <div class="flex items-center gap-2">
          <button (click)="openModal()" class="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
            <mat-icon>add</mat-icon>
          </button>
          <button (click)="authService.logout()" class="w-10 h-10 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center hover:text-danger transition-colors">
            <mat-icon>logout</mat-icon>
          </button>
        </div>
      </header>

      <main class="flex-1 p-6 max-w-md mx-auto w-full">
        @if (authService.loading()) {
          <div class="flex flex-col items-center justify-center py-20">
            <div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Loading Contacts</p>
          </div>
        } @else if (!authService.user()) {
          <div class="text-center py-20">
            <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
              <mat-icon class="text-5xl">lock</mat-icon>
            </div>
            <h2 class="text-xl font-bold text-slate-900 mb-2">Login Required</h2>
            <p class="text-slate-500 text-sm mb-8">Please sign in to manage your emergency contacts.</p>
            <button (click)="authService.loginWithGoogle()" class="bg-primary text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20">
              Sign In with Google
            </button>
          </div>
        } @else {
          <div class="mb-8">
            <p class="text-slate-500 text-sm">These contacts will be notified instantly when you trigger an emergency alert.</p>
          </div>

          <div class="space-y-4">
            @for (contact of contacts(); track contact.id) {
              <div class="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between group">
                <div class="flex items-center gap-4">
                  <div class="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold">
                    {{ contact.name.charAt(0) }}
                  </div>
                  <div>
                    <h3 class="font-bold text-slate-900">{{ contact.name }}</h3>
                    <p class="text-xs text-slate-500">{{ contact.phoneNumber }}</p>
                    <p class="text-[10px] text-slate-400">{{ contact.email }}</p>
                  </div>
                </div>
                <button (click)="deleteContact(contact.id)" class="w-10 h-10 text-slate-300 hover:text-danger hover:bg-danger/5 rounded-full transition-all">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            } @empty {
              <div class="text-center py-20">
                <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                  <mat-icon class="text-5xl">people_outline</mat-icon>
                </div>
                <h2 class="text-xl font-bold text-slate-900 mb-2">No Contacts Yet</h2>
                <p class="text-slate-500 text-sm mb-8">Add trusted contacts to keep them informed during your trips.</p>
                <button (click)="openModal()" class="bg-primary text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20">
                  Add First Contact
                </button>
              </div>
            }
          </div>
        }
      </main>

      <!-- Add Contact Modal -->
      @if (showAddModal()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div class="bg-white w-full max-w-sm rounded-[40px] p-8 animate-in zoom-in duration-300">
            <h2 class="text-2xl font-bold mb-6">Add Contact</h2>
            
            <form (ngSubmit)="addContact()" class="space-y-4">
              <div>
                <label for="contactName" class="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Name</label>
                <input type="text" id="contactName" [(ngModel)]="newContact.name" name="name" required
                       class="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20">
              </div>
              <div>
                <label for="contactPhone" class="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Phone Number</label>
                <input type="tel" id="contactPhone" [(ngModel)]="newContact.phoneNumber" name="phone" required
                       class="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20">
              </div>
              <div>
                <label for="contactEmail" class="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Email Address</label>
                <input type="email" id="contactEmail" [(ngModel)]="newContact.email" name="email" required
                       class="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20">
              </div>

              <div class="flex gap-3 pt-4">
                <button type="button" (click)="closeModal()" class="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold">
                  Cancel
                </button>
                <button type="submit" [disabled]="!newContact.name || !newContact.phoneNumber || !newContact.email || isSaving()" class="flex-1 bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center">
                  @if (isSaving()) {
                    <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  } @else {
                    Save
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class PassengerContacts {
  authService = inject(AuthService);
  contacts = signal<EmergencyContact[]>([]);
  showAddModal = signal(false);
  isSaving = signal(false);
  newContact = { name: '', phoneNumber: '', email: '' };
  private unsubscribe: Unsubscribe | null = null;

  constructor() {
    effect(() => {
      const user = this.authService.user();
      const profile = this.authService.profile();
      
      // Wait for both user and profile to ensure auth state is fully settled
      if (user && profile) {
        this.setupSubscription(user.uid);
      } else {
        this.contacts.set([]);
        if (this.unsubscribe) {
          this.unsubscribe();
          this.unsubscribe = null;
        }
      }
    });
  }

  private setupSubscription(uid: string) {
    if (this.unsubscribe) this.unsubscribe();
    
    const path = 'emergency_contacts';
    const q = query(
      collection(getDb(), path), 
      where('userId', '==', uid)
    );
    
    this.unsubscribe = onSnapshot(q, (snapshot) => {
      this.contacts.set(snapshot.docs.map(docSnap => ({ 
        id: docSnap.id, 
        ...docSnap.data() 
      } as EmergencyContact)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  }

  openModal() {
    this.showAddModal.set(true);
  }

  closeModal() {
    this.showAddModal.set(false);
    this.newContact = { name: '', phoneNumber: '', email: '' };
  }

  async addContact() {
    const user = this.authService.user();
    if (!user) return;

    this.isSaving.set(true);
    const path = 'emergency_contacts';
    try {
      await addDoc(collection(getDb(), path), {
        userId: user.uid,
        ...this.newContact
      });
      this.closeModal();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      this.isSaving.set(false);
    }
  }

  async deleteContact(id: string) {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    
    const path = `emergency_contacts/${id}`;
    try {
      await deleteDoc(doc(getDb(), 'emergency_contacts', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
}
