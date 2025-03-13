import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';

@Entity('bank_accounts')
export class BankAccount {
  @PrimaryGeneratedColumn({ type: 'int', name: 'account_id' })
  id: number;

  @Column({ type: 'int', name: 'customer_id' })
  customer_id: number;

  @Column({ type: 'varchar', length: 50 })
  account_number: string;

  @Column({ type: 'varchar', length: 255 })
  qr_code_token: string;

  // Relationships
  @ManyToOne(() => Customer, (customer) => customer.bank_accounts)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;
}
