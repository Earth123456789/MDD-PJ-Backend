import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthMethod } from './entities/auth-method.entity';
import { CreateAuthMethodDto } from './dto/create-auth-method.dto';
import { UpdateAuthMethodDto } from './dto/update-auth-method.dto';

@Injectable()
export class AuthMethodsService {
  constructor(
    @InjectRepository(AuthMethod)
    private authMethodsRepository: Repository<AuthMethod>,
  ) {}

  async create(createAuthMethodDto: CreateAuthMethodDto): Promise<AuthMethod> {
    const authMethod = this.authMethodsRepository.create({
      user_id: createAuthMethodDto.userId,
      auth_type: createAuthMethodDto.authType,
      auth_identifier: createAuthMethodDto.authIdentifier,
    });

    return this.authMethodsRepository.save(authMethod);
  }

  async findAll(): Promise<AuthMethod[]> {
    return this.authMethodsRepository.find({
      relations: ['user'],
    });
  }

  async findOne(id: number): Promise<AuthMethod> {
    const authMethod = await this.authMethodsRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!authMethod) {
      throw new NotFoundException(`Auth method with ID ${id} not found`);
    }

    return authMethod;
  }

  async findByUserId(userId: number): Promise<AuthMethod[]> {
    return this.authMethodsRepository.find({
      where: { user_id: userId },
      relations: ['user'],
    });
  }

  async findByTypeAndIdentifier(
    type: string,
    identifier: string,
  ): Promise<AuthMethod | null> {
    return this.authMethodsRepository.findOne({
      where: { auth_type: type, auth_identifier: identifier },
      relations: ['user'],
    });
  }

  async update(
    id: number,
    updateAuthMethodDto: UpdateAuthMethodDto,
  ): Promise<AuthMethod> {
    const authMethod = await this.findOne(id);

    if (updateAuthMethodDto.userId) {
      authMethod.user_id = updateAuthMethodDto.userId;
    }

    if (updateAuthMethodDto.authType) {
      authMethod.auth_type = updateAuthMethodDto.authType;
    }

    if (updateAuthMethodDto.authIdentifier) {
      authMethod.auth_identifier = updateAuthMethodDto.authIdentifier;
    }

    return this.authMethodsRepository.save(authMethod);
  }

  async remove(id: number): Promise<void> {
    const authMethod = await this.findOne(id);
    await this.authMethodsRepository.remove(authMethod);
  }
}
