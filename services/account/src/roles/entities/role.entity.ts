import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

interface Permission {
  [key: string]: boolean;
}

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn({ type: 'int', name: 'role_id' })
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  role_name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json', default: '{}' })
  permissions: Permission;

  // Relationships
  @ManyToMany(() => User, (user) => user.roles)
  @JoinTable()
  users: User[];
}
