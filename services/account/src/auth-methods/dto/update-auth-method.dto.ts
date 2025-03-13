import { PartialType } from '@nestjs/swagger';
import { CreateAuthMethodDto } from './create-auth-method.dto';

export class UpdateAuthMethodDto extends PartialType(CreateAuthMethodDto) {}
