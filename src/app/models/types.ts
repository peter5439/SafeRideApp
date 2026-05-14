export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'passenger' | 'driver';
  createdAt: string;
  phoneNumber?: string;
  nationalId?: string;
  profileImageUrl?: string;
  idFrontImageUrl?: string;
  idBackImageUrl?: string;
  verificationStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  rejectionReason?: string;
  verifiedAt?: string;
}

export interface DriverProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'driver';
  phoneNumber: string;
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'banned';
  vehicleId: string;
  reportCount?: number;
  banReason?: string;
  isBanned?: boolean; // For explicit boolean check
  createdAt: string;
  verifiedAt?: string;
  
  rating?: number;
  ratingCount?: number;

  // Personal Info
  firstName: string;
  middleName?: string;
  lastName: string;
  dob: string;
  gender: string;
  residentialAddress: string;
  stateCity: string;
  nationality: string;
  profilePhotoUrl?: string;

  // KYC
  nin: string;
  idType: 'National ID' | 'Voter Card' | 'Passport';
  idNumber: string;
  idExpiryDate?: string;
  idFrontPhotoUrl?: string;
  idBackPhotoUrl?: string;

  // License
  licenseNumber: string;
  licenseIssuingAuthority: string;
  licenseIssueDate: string;
  licenseExpiryDate: string;
  licenseClass: string;
  licenseFrontPhotoUrl?: string;
  licenseBackPhotoUrl?: string;

  // Vehicle (Flattened for easy access)
  plateNumber: string;
  model: string;
  make: string;
  color: string;
  year: string;
  
  commonRoutes?: CommonRoute[];

  // Document URLs
  vehicleRegistrationUrl?: string;
  proofOfOwnershipUrl?: string;
  roadWorthinessUrl?: string;
  insuranceUrl?: string;
}

export interface Vehicle {
  id: string;
  driverId: string;
  plateNumber: string;
  make: string;
  model: string;
  year: string;
  color: string;
  ownerName: string;
  engineNumber?: string;
  chassisNumber?: string;
}

export interface Incident {
  id: string;
  reporterId: string;
  reporterName?: string;
  reporterEmail?: string;
  reporterPhone?: string;
  driverId?: string;
  driverName?: string;
  tripId?: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  adminNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface EmergencyContact {
  id: string;
  userId: string;
  name: string;
  phoneNumber: string;
  email: string;
}

export interface Trip {
  id: string;
  passengerId: string;
  passengerName?: string;
  driverId: string;
  timestamp: string;
  status: 'active' | 'completed';
  ratingId?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  driverName?: string;
}

export interface Rating {
  id: string;
  tripId: string;
  passengerId: string;
  driverId: string;
  score: number;
  comment?: string;
  timestamp: string;
}

export interface LostItem {
  id: string;
  tripId: string;
  reporterId: string;
  reporterRole: 'passenger' | 'driver';
  description: string;
  status: 'reported' | 'found' | 'returned';
  timestamp: string;
  passengerId: string;
  driverId: string;
  passengerName?: string;
  driverName?: string;
}

export interface CommonRoute {
  id: string;
  from: string;
  to: string;
  distance: string;
  estimatedTime: string;
  popularity: 'High' | 'Medium' | 'Low';
  baseFare: number;
}
