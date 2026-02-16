import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;

  const mockPaymentsService = {
    handleWebhook: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: mockPaymentsService }],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should handle webhook and return received', async () => {
    const payload = Buffer.from('test');
    const signature = 'sig_test';

    const result = await controller.handleWebhook(payload, signature);

    expect(result).toEqual({ received: true });
    expect(mockPaymentsService.handleWebhook).toHaveBeenCalledWith(
      payload,
      signature,
    );
  });

  it('should throw if signature is missing', async () => {
    const payload = Buffer.from('test');

    await expect(controller.handleWebhook(payload, '')).rejects.toThrow(
      BadRequestException,
    );
  });
});
