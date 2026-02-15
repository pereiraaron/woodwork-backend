import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy, JwtPayload } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => 'test-secret' },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should return the payload from validate', () => {
    const payload: JwtPayload = {
      id: 'user123',
      email: 'test@example.com',
      role: 'member',
      projectId: 'proj123',
      membershipId: 'mem123',
    };

    const result = strategy.validate(payload);

    expect(result).toEqual(payload);
    expect(result.id).toBe('user123');
    expect(result.email).toBe('test@example.com');
    expect(result.role).toBe('member');
    expect(result.projectId).toBe('proj123');
  });
});
