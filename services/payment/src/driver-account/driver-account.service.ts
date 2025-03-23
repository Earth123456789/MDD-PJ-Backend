import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDriverAccountDto } from './dto/create-driver-account.dto';
import { UpdateDriverAccountDto } from './dto/update-driver-account.dto';

@Injectable()
export class DriverAccountService {
  private readonly logger = new Logger(DriverAccountService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a bank account for a driver
   */
  async createDriverAccount(createDriverAccountDto: CreateDriverAccountDto) {
    try {
      // Check if driver already has an account
      const existingAccount = await this.prisma.driverBankAccount.findFirst({
        where: { driver_id: createDriverAccountDto.driver_id },
      });

      if (existingAccount) {
        // If the driver already has a default account, make it non-default
        if (existingAccount.is_default && createDriverAccountDto.is_default) {
          await this.prisma.driverBankAccount.update({
            where: { id: existingAccount.id },
            data: { is_default: false },
          });
        }
      }

      // Create new bank account
      const driverAccount = await this.prisma.driverBankAccount.create({
        data: createDriverAccountDto,
      });

      this.logger.log(
        `Created bank account for driver ${createDriverAccountDto.driver_id}`,
      );
      return driverAccount;
    } catch (error) {
      this.logger.error(
        `Failed to create driver bank account: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to create driver bank account: ${error.message}`,
      );
    }
  }

  /**
   * Get a driver's bank account by ID
   */
  async getDriverAccountById(id: number) {
    const account = await this.prisma.driverBankAccount.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException(
        `Driver bank account with ID ${id} not found`,
      );
    }

    return account;
  }

  /**
   * Get all bank accounts for a driver
   */
  async getDriverAccountsByDriverId(driverId: number) {
    return this.prisma.driverBankAccount.findMany({
      where: { driver_id: driverId },
    });
  }

  /**
   * Update a driver's bank account
   */
  async updateDriverAccount(
    id: number,
    updateDriverAccountDto: UpdateDriverAccountDto,
  ) {
    try {
      const account = await this.prisma.driverBankAccount.findUnique({
        where: { id },
      });

      if (!account) {
        throw new NotFoundException(
          `Driver bank account with ID ${id} not found`,
        );
      }

      // If making this account default, make other accounts non-default
      if (updateDriverAccountDto.is_default) {
        await this.prisma.driverBankAccount.updateMany({
          where: {
            driver_id: account.driver_id,
            id: { not: id },
          },
          data: { is_default: false },
        });
      }

      // Update the account
      const updatedAccount = await this.prisma.driverBankAccount.update({
        where: { id },
        data: updateDriverAccountDto,
      });

      return updatedAccount;
    } catch (error) {
      this.logger.error(
        `Failed to update driver bank account: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get transaction history for a driver
   */
  async getDriverTransactions(driverId: number) {
    // Get all driver accounts
    const accounts = await this.prisma.driverBankAccount.findMany({
      where: { driver_id: driverId },
    });

    const accountIds = accounts.map((account) => account.id);

    // Get transactions for all accounts
    return this.prisma.paymentTransaction.findMany({
      where: { driver_account_id: { in: accountIds } },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Get account balance for a driver
   */
  async getDriverBalance(driverId: number) {
    const accounts = await this.prisma.driverBankAccount.findMany({
      where: { driver_id: driverId },
    });

    if (accounts.length === 0) {
      return { totalBalance: 0, accounts: [] };
    }

    // Calculate total balance across all accounts
    const totalBalance = accounts.reduce(
      (sum, account) => sum + account.balance,
      0,
    );

    return {
      totalBalance,
      currency: 'THB',
      accounts: accounts.map((account) => ({
        id: account.id,
        bankName: account.bank_name,
        accountNumber: account.account_number,
        balance: account.balance,
        currency: account.currency,
        isDefault: account.is_default,
      })),
    };
  }
}
