import { Test, TestingModule } from '@nestjs/testing';
import { AuthMethodsController } from './auth-methods.controller';

describe('AuthMethodsController', () => {
  let controller: AuthMethodsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthMethodsController],
    }).compile();

    controller = module.get<AuthMethodsController>(AuthMethodsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
