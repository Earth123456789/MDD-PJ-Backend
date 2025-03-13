import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Role } from '../../roles/entities/role.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { AuthMethod } from '../../auth-methods/entities/auth-method.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'int', name: 'user_id' })
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  @Exclude()
  password_hash: string;

  @Column({ type: 'varchar', length: 50 })
  first_name: string;

  @Column({ type: 'varchar', length: 50 })
  last_name: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  // Phone number for SMS authentication
  @Column({ type: 'varchar', length: 20, nullable: true })
  phone_number: string;

  // Username for username login
  @Column({ type: 'varchar', length: 50, nullable: true, unique: true })
  username: string;

  // Relationships
  @ManyToMany(() => Role, (role) => role.users)
  @JoinTable({
    name: 'user_roles',
    joinColumn: {
      name: 'user_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'role_id',
      referencedColumnName: 'id',
    },
  })
  roles: Role[];

  @OneToMany(() => Customer, (customer) => customer.user)
  customers: Customer[];

  @OneToMany(() => AuthMethod, (authMethod) => authMethod.user)
  auth_methods: AuthMethod[];

  // Helper methods
  hasRole(roleName: string): boolean {
    return this.roles?.some((role) => role.role_name === roleName) ?? false;
  }
}
