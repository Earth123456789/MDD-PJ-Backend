import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';

@Entity('billing')
export class Billing {
  @PrimaryGeneratedColumn({ type: 'int', name: 'billing_id' })
  id: number;

  @Column({ type: 'int', name: 'customer_id' })
  customer_id: number;

  @Column({ type: 'int', name: 'order_id', nullable: true })
  order_id: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;

  @Column({ type: 'date', nullable: true })
  due_date: Date;

  // Relationships
  @ManyToOne(() => Customer, (customer) => customer.billings)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;
}
