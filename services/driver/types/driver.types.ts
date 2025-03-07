import { Driver, DriverStatus, VerificationStatus } from '@prisma/client';

export interface DriverInput {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  licenseNumber: string;
  licenseExpiry: Date;
  idCardNumber: string;
  dateOfBirth: Date;
  address: string;
  profileImage?: string;
  password: string;
}

export interface DriverUpdateInput {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  email?: string;
  licenseNumber?: string;
  licenseExpiry?: Date;
  idCardNumber?: string;
  dateOfBirth?: Date;
  address?: string;
  profileImage?: string;
  password?: string;
  status?: DriverStatus;
  isAvailable?: boolean;
  verificationStatus?: VerificationStatus;
}

export interface DriverFilters {
  status?: DriverStatus;
  isAvailable?: string;
  verificationStatus?: VerificationStatus;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DriverPaginatedResult {
  data: Driver[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    pages: number;
  };
}

export interface LoginInput {
  phoneNumber: string;
  password: string;
}

export interface LoginResult {
  driver: Omit<Driver, 'password'>;
  token: string;
}

export interface LocationInput {
  latitude: number;
  longitude: number;
  currentLocation?: string;
}

export interface NearbyDriversParams {
  latitude: number;
  longitude: number;
  radius: number;
}