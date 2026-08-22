import { Module, forwardRef } from '@nestjs/common';
import { CheckinController } from './checkin.controller';
import { CheckinService } from './checkin.service';
import { BitableModule } from '../bitable/bitable.module';

@Module({
  imports: [BitableModule],
  controllers: [CheckinController],
  providers: [CheckinService],
})
export class CheckinModule {}
