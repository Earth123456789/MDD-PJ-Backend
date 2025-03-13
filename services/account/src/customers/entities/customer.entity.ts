import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { BankAccount } from '../../bank-accounts/entities/bank-account.entity';
import { Billing } from '../../billing/entities/billing.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn({ type: 'int', name: 'customer_id' })
  id: number;

  @Column({ type: 'int', name: 'user_id' })
  user_id: number;

  @Column({ type: 'varchar', length: 100 })
  company_name: string;

  @Column({ type: 'varchar', length: 50 })
  business_type: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  contact_phone: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  credit_limit: number;

  // Relationships
  @ManyToOne(() => User, (user) => user.customers)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => BankAccount, (bankAccount) => bankAccount.customer)
  bank_accounts: BankAccount[];

  @OneToMany(() => Billing, (billing) => billing.customer)
  billings: Billing[];
}
