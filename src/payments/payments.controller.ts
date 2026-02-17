import {
  BadRequestException,
  Controller,
  Headers,
  Post,
  RawBody,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('webhook')
  @ApiOperation({ summary: 'Stripe webhook handler' })
  @ApiExcludeEndpoint()
  async handleWebhook(
    @RawBody() payload: Buffer,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    await this.paymentsService.handleWebhook(payload, signature);

    return { received: true };
  }
}
