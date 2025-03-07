import { PrismaClient, Driver, DriverStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { 
  DriverFilters, 
  DriverInput, 
  DriverPaginatedResult, 
  DriverUpdateInput, 
  LoginResult 
} from '../types/driver.types';

const prisma = new PrismaClient();

/**
 * Create a new driver
 */
export const createDriver = async (driverData: DriverInput): Promise<Omit<Driver, 'password'>> => {
  // Hash password if provided
  if (driverData.password) {
    driverData.password = await bcrypt.hash(driverData.password, 10);
  }

  const driver = await prisma.driver.create({
    data: driverData as any
  });

  // Remove sensitive data before returning
  const { password, ...driverWithoutPassword } = driver as Driver & { password: string };
  return driverWithoutPassword;
};

/**
 * Login driver
 */
export const loginDriver = async (phoneNumber: string, password: string): Promise<LoginResult> => {
  // Find driver by phone number
  const driver = await prisma.driver.findUnique({
    where: { phoneNumber }
  });

  if (!driver || !(driver as any).password) {
    throw new Error('Invalid credentials');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, (driver as any).password);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  // Generate JWT token
  const token = jwt.sign(
    { id: driver.id, phoneNumber: driver.phoneNumber },
    process.env.JWT_SECRET || 'default_secret',
    { expiresIn: '24h' }
  );

  // Remove sensitive data before returning
  const { password: _, ...driverWithoutPassword } = driver as Driver & { password: string };
  
  return {
    driver: driverWithoutPassword,
    token
  };
};

/**
 * Find all drivers with optional filtering
 */
export const findAllDrivers = async (filters: DriverFilters = {}): Promise<DriverPaginatedResult> => {
  const { status, isAvailable, verificationStatus, limit = 10, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = filters;
  
  // Build where condition based on filters
  const where: any = {};
  
  if (status) {
    where.status = status;
  }
  
  if (isAvailable !== undefined) {
    where.isAvailable = isAvailable === 'true';
  }
  
  if (verificationStatus) {
    where.verificationStatus = verificationStatus;
  }
  
  // Query with pagination and sorting
  const drivers = await prisma.driver.findMany({
    where,
    take: Number(limit),
    skip: Number(offset),
    orderBy: {
      [sortBy]: sortOrder.toLowerCase()
    }
  });
  
  const total = await prisma.driver.count({ where });
  
  return {
    data: drivers,
    pagination: {
      total,
      limit: Number(limit),
      offset: Number(offset),
      pages: Math.ceil(total / Number(limit))
    }
  };
};

/**
 * Find available drivers
 */
export const findAvailableDrivers = async (): Promise<Driver[]> => {
  return prisma.driver.findMany({
    where: {
      isAvailable: true,
      status: 'ACTIVE'
    }
  });
};

/**
 * Find driver by ID
 */
export const findDriverById = async (id: string): Promise<Driver | null> => {
  return prisma.driver.findUnique({
    where: { id }
  });
};

/**
 * Update driver information
 */
export const updateDriver = async (id: string, driverData: DriverUpdateInput): Promise<Driver | null> => {
  // Handle password update
  if (driverData.password) {
    driverData.password = await bcrypt.hash(driverData.password, 10);
  }
  
  return prisma.driver.update({
    where: { id },
    data: driverData as any
  });
};

/**
 * Delete a driver
 */
export const deleteDriver = async (id: string): Promise<Driver | null> => {
  return prisma.driver.delete({
    where: { id }
  });
};

/**
 * Update driver status
 */
export const updateDriverStatus = async (id: string, status: DriverStatus): Promise<Driver | null> => {
  return prisma.driver.update({
    where: { id },
    data: { status }
  });
};

/**
 * Update driver location
 */
export const updateDriverLocation = async (
  id: string, 
  latitude: number, 
  longitude: number, 
  currentLocation?: string
): Promise<Driver | null> => {
  return prisma.driver.update({
    where: { id },
    data: {
      latitude,
      longitude,
      currentLocation,
      updatedAt: new Date()
    }
  });
};

/**
 * Update driver availability status
 */
export const updateDriverAvailability = async (id: string, isAvailable: boolean): Promise<Driver | null> => {
  return prisma.driver.update({
    where: { id },
    data: { isAvailable }
  });
};

/**
 * Find nearby drivers based on latitude, longitude and radius (in km)
 */
export const findNearbyDrivers = async (
  latitude: number, 
  longitude: number, 
  radius: number
): Promise<Driver[]> => {
  // We'll use Prisma's raw query capability to perform geospatial query
  // This calculation uses the Haversine formula
  
  const drivers = await prisma.$queryRaw<Driver[]>`
    SELECT 
      *, 
      ( 6371 * acos( cos( radians(${latitude}) ) * 
        cos( radians( latitude ) ) * 
        cos( radians( longitude ) - radians(${longitude}) ) + 
        sin( radians(${latitude}) ) * 
        sin( radians( latitude ) ) 
      ) ) AS distance 
    FROM "Driver" 
    WHERE status = 'ACTIVE' 
    AND "isAvailable" = true
    HAVING distance < ${radius} 
    ORDER BY distance;
  `;
  
  return drivers;
};