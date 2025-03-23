// matching/src/services/user-driver-validation.service.ts

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

// Define interfaces for responses
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface UserData {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  role: string;
  created_at: string;
  updated_at: string;
}

interface DriverData {
  id: number;
  user_id: number;
  license_number: string;
  id_card_number: string;
  current_location?: {
    latitude: number;
    longitude: number;
  };
  status: string;
  rating: number;
  created_at: string;
  updated_at: string;
  user?: UserData;
  distance?: number; // Add distance property for nearby drivers
}

@Injectable()
export class UserDriverValidationService {
  private readonly logger = new Logger(UserDriverValidationService.name);
  private readonly userDriverServiceUrl: string;

  constructor(private readonly configService: ConfigService) {
    // Get the user-driver service URL from environment variables or use default
    this.userDriverServiceUrl =
      this.configService.get<string>('USER_DRIVER_SERVICE_URL') ||
      'http://localhost:3001';
  }

  /**
   * Validate that a user exists in the user-driver service
   * @param userId - The ID of the user to validate
   */
  async validateUser(userId: number): Promise<boolean> {
    try {
      this.logger.log(`Validating user with ID: ${userId}`);

      // Make a request to the user-driver service to check if the user exists
      const response = await axios.get<ApiResponse<UserData>>(
        `${this.userDriverServiceUrl}/api/users/${userId}`,
      );

      // If we get a successful response, the user exists
      return response.data && response.data.success === true;
    } catch (error) {
      this.logger.error(
        `Error validating user with ID ${userId}: ${error.message}`,
      );

      if (error.response && error.response.status === 404) {
        return false; // User not found
      }

      // For other errors, we'll log but not fail the operation
      return false;
    }
  }

  /**
   * Validate that a driver exists in the user-driver service
   * @param driverId - The ID of the driver to validate
   */
  async validateDriver(driverId: number): Promise<boolean> {
    try {
      this.logger.log(`Validating driver with ID: ${driverId}`);

      // Make a request to the user-driver service to check if the driver exists
      const response = await axios.get<ApiResponse<DriverData>>(
        `${this.userDriverServiceUrl}/api/drivers/${driverId}`,
      );

      this.logger.log(
        `Driver validation response: ${JSON.stringify(response.data)}`,
      );

      // If we get a successful response, the driver exists
      return response.data && response.data.success === true;
    } catch (error) {
      this.logger.error(
        `Error validating driver with ID ${driverId}: ${error.message}`,
      );

      if (error.response) {
        this.logger.error(
          `Response status: ${error.response.status}, data: ${JSON.stringify(error.response.data)}`,
        );
      }

      if (error.response && error.response.status === 404) {
        return false; // Driver not found
      }

      // For other errors, we'll log but not fail the operation
      return false;
    }
  }

  /**
   * Get driver information from the user-driver service
   * @param driverId - The ID of the driver
   */
  async getDriverInfo(driverId: number): Promise<DriverData | null> {
    try {
      this.logger.log(`Getting driver info for ID: ${driverId}`);

      const response = await axios.get<ApiResponse<DriverData>>(
        `${this.userDriverServiceUrl}/api/drivers/${driverId}`,
      );

      if (response.data && response.data.success === true) {
        return response.data.data;
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Error getting driver info for ID ${driverId}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Get driver information by user ID from the user-driver service
   * @param userId - The ID of the user
   */
  async getDriverByUserId(userId: number): Promise<DriverData | null> {
    try {
      this.logger.log(`Getting driver info for user ID: ${userId}`);

      const response = await axios.get<ApiResponse<DriverData>>(
        `${this.userDriverServiceUrl}/api/drivers/user/${userId}`,
      );

      if (response.data && response.data.success === true) {
        return response.data.data;
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Error getting driver info for user ID ${userId}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Get user information from the user-driver service
   * @param userId - The ID of the user
   */
  async getUserInfo(userId: number): Promise<UserData | null> {
    try {
      this.logger.log(`Getting user info for ID: ${userId}`);

      const response = await axios.get<ApiResponse<UserData>>(
        `${this.userDriverServiceUrl}/api/users/${userId}`,
      );

      if (response.data && response.data.success === true) {
        return response.data.data;
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Error getting user info for ID ${userId}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Find nearby available drivers
   * @param location - The location to find drivers near
   * @param radius - The radius to search within (in km)
   */
  async findNearbyDrivers(
    location: { latitude: number; longitude: number },
    radius: number = 5,
  ): Promise<DriverData[]> {
    try {
      this.logger.log(
        `Finding nearby drivers at location: ${JSON.stringify(location)}, radius: ${radius}km`,
      );

      const response = await axios.get<ApiResponse<DriverData[]>>(
        `${this.userDriverServiceUrl}/api/drivers/nearby`,
        {
          params: {
            latitude: location.latitude,
            longitude: location.longitude,
            radius,
          },
        },
      );

      if (response.data && response.data.success === true) {
        return response.data.data;
      }

      return [];
    } catch (error) {
      this.logger.error(`Error finding nearby drivers: ${error.message}`);
      return [];
    }
  }

  /**
   * Update driver location
   * @param driverId - The ID of the driver
   * @param location - The new location
   */
  async updateDriverLocation(
    driverId: number,
    location: { latitude: number; longitude: number },
  ): Promise<DriverData | null> {
    try {
      this.logger.log(`Updating location for driver ID: ${driverId}`);

      const response = await axios.patch<ApiResponse<DriverData>>(
        `${this.userDriverServiceUrl}/api/drivers/${driverId}/location`,
        { latitude: location.latitude, longitude: location.longitude },
      );

      if (response.data && response.data.success === true) {
        return response.data.data;
      }

      return null;
    } catch (error) {
      this.logger.error(`Error updating driver location: ${error.message}`);
      return null;
    }
  }

  /**
   * Update driver status
   * @param driverId - The ID of the driver
   * @param status - The new status ('active', 'inactive', or 'suspended')
   */
  async updateDriverStatus(
    driverId: number,
    status: 'active' | 'inactive' | 'suspended',
  ): Promise<DriverData | null> {
    try {
      this.logger.log(
        `Updating status for driver ID: ${driverId} to ${status}`,
      );

      const response = await axios.patch<ApiResponse<DriverData>>(
        `${this.userDriverServiceUrl}/api/drivers/${driverId}/status`,
        { status },
      );

      if (response.data && response.data.success === true) {
        return response.data.data;
      }

      return null;
    } catch (error) {
      this.logger.error(`Error updating driver status: ${error.message}`);
      return null;
    }
  }

  /**
   * Rate a driver
   * @param driverId - The ID of the driver
   * @param rating - The rating (0-5)
   */
  async rateDriver(
    driverId: number,
    rating: number,
  ): Promise<DriverData | null> {
    try {
      this.logger.log(`Rating driver ID: ${driverId} with ${rating} stars`);

      const response = await axios.post<ApiResponse<DriverData>>(
        `${this.userDriverServiceUrl}/api/drivers/${driverId}/rate`,
        { rating },
      );

      if (response.data && response.data.success === true) {
        return response.data.data;
      }

      return null;
    } catch (error) {
      this.logger.error(`Error rating driver: ${error.message}`);
      return null;
    }
  }
}
