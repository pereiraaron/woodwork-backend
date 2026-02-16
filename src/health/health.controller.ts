import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MongooseHealthIndicator,
} from '@nestjs/terminus';

@Controller()
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private mongoose: MongooseHealthIndicator,
  ) {}

  @Get()
  root() {
    return { status: 'ok', message: 'Woodwork API is running' };
  }

  @Get('health')
  @HealthCheck()
  check() {
    return this.health.check([() => this.mongoose.pingCheck('mongodb')]);
  }
}
