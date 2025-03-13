import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthMethodsService } from './auth-methods.service';
import { CreateAuthMethodDto } from './dto/create-auth-method.dto';
import { UpdateAuthMethodDto } from './dto/update-auth-method.dto';

@ApiTags('auth-methods')
@Controller('auth-methods')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuthMethodsController {
  constructor(private readonly authMethodsService: AuthMethodsService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new authentication method' })
  @ApiResponse({
    status: 201,
    description: 'The authentication method has been successfully created.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  create(@Body() createAuthMethodDto: CreateAuthMethodDto) {
    return this.authMethodsService.create(createAuthMethodDto);
  }

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Get all authentication methods' })
  @ApiResponse({
    status: 200,
    description: 'Return all authentication methods.',
  })
  findAll() {
    return this.authMethodsService.findAll();
  }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Get an authentication method by id' })
  @ApiResponse({
    status: 200,
    description: 'Return the authentication method.',
  })
  @ApiResponse({ status: 404, description: 'Authentication method not found.' })
  findOne(@Param('id') id: string) {
    return this.authMethodsService.findOne(+id);
  }

  @Get('user/:userId')
  @Roles('admin')
  @ApiOperation({ summary: 'Get authentication methods by user id' })
  @ApiResponse({
    status: 200,
    description: 'Return the authentication methods for a user.',
  })
  findByUserId(@Param('userId') userId: string) {
    return this.authMethodsService.findByUserId(+userId);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update an authentication method' })
  @ApiResponse({
    status: 200,
    description: 'The authentication method has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'Authentication method not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  update(
    @Param('id') id: string,
    @Body() updateAuthMethodDto: UpdateAuthMethodDto,
  ) {
    return this.authMethodsService.update(+id, updateAuthMethodDto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete an authentication method' })
  @ApiResponse({
    status: 200,
    description: 'The authentication method has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Authentication method not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  remove(@Param('id') id: string) {
    return this.authMethodsService.remove(+id);
  }
}
