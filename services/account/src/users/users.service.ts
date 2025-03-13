import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RolesService } from '../roles/roles.service';

@Injectable()
export class UsersService {
  // In-memory store for SMS verification codes with TTL
  private verificationCodes: Map<string, { code: string; expires: Date }> =
    new Map();

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private rolesService: RolesService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create({
      email: createUserDto.email,
      password_hash: createUserDto.password,
      first_name: createUserDto.firstName,
      last_name: createUserDto.lastName,
      phone_number: createUserDto.phoneNumber,
      username: createUserDto.username,
    });

    // Save user
    const savedUser = await this.usersRepository.save(user);

    // Assign default role if none provided
    if (!createUserDto.roleIds || createUserDto.roleIds.length === 0) {
      const customerRole = await this.rolesService.findByName('customer');
      if (customerRole) {
        savedUser.roles = [customerRole];
        await this.usersRepository.save(savedUser);
      }
    } else {
      // Assign provided roles
      const roles = await Promise.all(
        createUserDto.roleIds.map((id) => this.rolesService.findOne(id)),
      );
      savedUser.roles = roles.filter((role) => role !== null);
      await this.usersRepository.save(savedUser);
    }

    return this.findOne(savedUser.id);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      relations: ['roles'],
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['roles'],
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { username },
      relations: ['roles'],
    });
  }

  async findByPhone(phoneNumber: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { phone_number: phoneNumber },
      relations: ['roles'],
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // Update basic fields
    if (updateUserDto.email) user.email = updateUserDto.email;
    if (updateUserDto.password) user.password_hash = updateUserDto.password;
    if (updateUserDto.firstName) user.first_name = updateUserDto.firstName;
    if (updateUserDto.lastName) user.last_name = updateUserDto.lastName;
    if (updateUserDto.phoneNumber)
      user.phone_number = updateUserDto.phoneNumber;
    if (updateUserDto.username) user.username = updateUserDto.username;
    if (updateUserDto.status) user.status = updateUserDto.status;

    // Update roles if provided
    if (updateUserDto.roleIds && updateUserDto.roleIds.length > 0) {
      const roles = await Promise.all(
        updateUserDto.roleIds.map((roleId) =>
          this.rolesService.findOne(roleId),
        ),
      );
      user.roles = roles.filter((role) => role !== null);
    }

    return this.usersRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }

  async setVerificationCode(phoneNumber: string, code: string): Promise<void> {
    // Set expiration to 10 minutes from now
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 10);

    this.verificationCodes.set(phoneNumber, { code, expires });
  }

  async verifyCode(phoneNumber: string, code: string): Promise<boolean> {
    const verification = this.verificationCodes.get(phoneNumber);

    if (!verification) {
      return false;
    }

    // Check if code is expired
    if (verification.expires < new Date()) {
      this.verificationCodes.delete(phoneNumber);
      throw new BadRequestException('Verification code has expired');
    }

    // Check if code matches
    if (verification.code !== code) {
      return false;
    }

    // Delete code after successful verification
    this.verificationCodes.delete(phoneNumber);
    return true;
  }

  async markPhoneAsVerified(phoneNumber: string): Promise<void> {
    const user = await this.findByPhone(phoneNumber);
    if (user) {
      // Could add a verified_phone flag to user entity if needed
      // For now, we'll just assume phone is verified at this point
    }
  }
}
