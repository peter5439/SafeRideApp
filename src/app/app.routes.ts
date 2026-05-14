import {Routes} from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then(m => m.Home)
  },
  {
    path: 'admin',
    children: [
      { path: 'login', loadComponent: () => import('./pages/admin/login/login').then(m => m.AdminLogin) },
      { path: 'dashboard', loadComponent: () => import('./pages/admin/dashboard/dashboard').then(m => m.AdminDashboard) },
      { path: 'drivers', loadComponent: () => import('./pages/admin/drivers/drivers').then(m => m.AdminDrivers) },
      { path: 'drivers/:id', loadComponent: () => import('./pages/admin/drivers/driver-details').then(m => m.AdminDriverDetails) },
      { path: 'incidents', loadComponent: () => import('./pages/admin/incidents/incidents').then(m => m.AdminIncidents) },
      { path: 'passengers', loadComponent: () => import('./pages/admin/passengers/passengers').then(m => m.AdminPassengers) },
      { path: 'passengers/:id', loadComponent: () => import('./pages/admin/passengers/passenger-details').then(m => m.AdminPassengerDetails) },
      { path: 'lost-items', loadComponent: () => import('./pages/admin/lost-items/lost-items').then(m => m.AdminLostItems) },
    ]
  },
  {
    path: 'driver',
    children: [
      { path: 'login', loadComponent: () => import('./pages/driver/login/login').then(m => m.DriverLogin) },
      { path: 'register', loadComponent: () => import('./pages/driver/register/register').then(m => m.DriverRegister) },
      { path: 'dashboard', loadComponent: () => import('./pages/driver/dashboard/dashboard').then(m => m.DriverDashboard) },
      { path: 'qr', loadComponent: () => import('./pages/driver/qr/qr').then(m => m.DriverQR) },
      { path: 'profile', loadComponent: () => import('./pages/driver/profile/profile').then(m => m.DriverProfile) },
      { path: 'history', loadComponent: () => import('./pages/driver/history/history').then(m => m.DriverHistory) },
      { path: 'lost-items', loadComponent: () => import('./pages/driver/lost-items/lost-items').then(m => m.DriverLostItems) },
    ]
  },
  {
    path: 'passenger',
    children: [
      { path: 'login', loadComponent: () => import('./pages/passenger/login/login').then(m => m.PassengerLogin) },
      { path: 'home', loadComponent: () => import('./pages/passenger/home/home').then(m => m.PassengerHome) },
      { path: 'profile', loadComponent: () => import('./pages/passenger/profile/profile').then(m => m.PassengerProfile) },
      { path: 'scan', loadComponent: () => import('./pages/passenger/scan/scan').then(m => m.PassengerScan) },
      { path: 'driver-details/:id', loadComponent: () => import('./pages/passenger/driver-details/driver-details').then(m => m.PassengerDriverDetails) },
      { path: 'emergency', loadComponent: () => import('./pages/passenger/emergency/emergency').then(m => m.PassengerEmergency) },
      { path: 'contacts', loadComponent: () => import('./pages/passenger/contacts/contacts').then(m => m.PassengerContacts) },
      { path: 'history', loadComponent: () => import('./pages/passenger/history/history').then(m => m.PassengerHistory) },
      { path: 'lost-items', loadComponent: () => import('./pages/passenger/lost-items/lost-items').then(m => m.PassengerLostItems) },
      { path: 'ride/:tripId', loadComponent: () => import('./pages/passenger/ride-in-progress/ride-in-progress').then(m => m.RideInProgress) },
    ]
  },
  {
    path: 'share',
    children: [
      { path: 'trip/:tripId', loadComponent: () => import('./pages/share/trip-tracker').then(m => m.TripTracker) },
    ]
  },
  { path: '**', redirectTo: '' }
];
