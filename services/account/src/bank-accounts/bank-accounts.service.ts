import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccount } from './entities/bank-account.entity';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';

@Injectable()
export class BankAccountsService {
  constructor(
    @InjectRepository(BankAccount)
    private bankAccountsRepository: Repository<BankAccount>,
  ) {}

  async create(
    createBankAccountDto: CreateBankAccountDto,
  ): Promise<BankAccount> {
    const bankAccount =
      this.bankAccountsRepository.create(createBankAccountDto);
    return this.bankAccountsRepository.save(bankAccount);
  }

  async findAll(): Promise<BankAccount[]> {
    return this.bankAccountsRepository.find({
      relations: ['customer', 'customer.user'],
    });
  }

  async findOne(id: number): Promise<BankAccount> {
    const bankAccount = await this.bankAccountsRepository.findOne({
      where: { id },
      relations: ['customer', 'customer.user'],
    });

    if (!bankAccount) {
      throw new NotFoundException(`Bank account with ID ${id} not found`);
    }

    return bankAccount;
  }

  async findByCustomerId(customerId: number): Promise<BankAccount[]> {
    return this.bankAccountsRepository.find({
      where: { customer_id: customerId },
      relations: ['customer', 'customer.user'],
    });
  }

  async update(
    id: number,
    updateBankAccountDto: UpdateBankAccountDto,
  ): Promise<BankAccount> {
    const bankAccount = await this.findOne(id);

    Object.assign(bankAccount, updateBankAccountDto);

    return this.bankAccountsRepository.save(bankAccount);
  }

  async remove(id: number): Promise<void> {
    const bankAccount = await this.findOne(id);
    await this.bankAccountsRepository.remove(bankAccount);
  }
}
