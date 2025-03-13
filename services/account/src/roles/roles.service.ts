import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
  ) {
    // Create default roles on service initialization
    this.initDefaultRoles();
  }

  private async initDefaultRoles() {
    const defaultRoles = [
      {
        role_name: 'customer',
        description: 'Regular customer role',
        permissions: {
          profile: ['read', 'update'],
          orders: ['create', 'read'],
          bankAccounts: ['read'],
        },
      },
      {
        role_name: 'delivery',
        description: 'Delivery personnel role',
        permissions: {
          orders: ['read', 'update'],
          deliveries: ['read', 'update'],
        },
      },
      {
        role_name: 'admin',
        description: 'Administrator role with full access',
        permissions: {
          users: ['create', 'read', 'update', 'delete'],
          roles: ['create', 'read', 'update', 'delete'],
          customers: ['create', 'read', 'update', 'delete'],
          bankAccounts: ['create', 'read', 'update', 'delete'],
          billing: ['create', 'read', 'update', 'delete'],
          orders: ['create', 'read', 'update', 'delete'],
          deliveries: ['create', 'read', 'update', 'delete'],
        },
      },
    ];

    for (const roleData of defaultRoles) {
      const existingRole = await this.findByName(roleData.role_name);
      if (!existingRole) {
        await this.create(roleData);
      }
    }
  }

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const role = this.rolesRepository.create(createRoleDto);
    return this.rolesRepository.save(role);
  }

  async findAll(): Promise<Role[]> {
    return this.rolesRepository.find();
  }

  async findOne(id: number): Promise<Role> {
    const role = await this.rolesRepository.findOne({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return role;
  }

  async findByName(name: string): Promise<Role | null> {
    return this.rolesRepository.findOne({
      where: { role_name: name },
    });
  }

  async update(id: number, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id);

    Object.assign(role, updateRoleDto);

    return this.rolesRepository.save(role);
  }

  async remove(id: number): Promise<void> {
    const role = await this.findOne(id);
    await this.rolesRepository.remove(role);
  }
}
