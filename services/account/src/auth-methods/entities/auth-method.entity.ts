import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('auth_methods')
export class AuthMethod {
  @PrimaryGeneratedColumn({ type: 'int', name: 'auth_id' })
  id: number;

  @Column({ type: 'int', name: 'user_id' })
  user_id: number;

  @Column({ type: 'varchar', length: 20 })
  auth_type: string;

  @Column({ type: 'varchar', length: 255 })
  auth_identifier: string;

  // Relationships
  @ManyToOne(() => User, (user) => user.auth_methods)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
