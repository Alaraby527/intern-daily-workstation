import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BitableController } from './bitable.controller';
import { BitableService } from './bitable.service';
import { BusinessRecordService } from './business-record.service';
import { SheetRecordService } from './sheet-record.service';

@Module({
  imports: [HttpModule],
  controllers: [BitableController],
  providers: [BitableService, BusinessRecordService, SheetRecordService],
  exports: [BitableService, BusinessRecordService, SheetRecordService],
})
export class BitableModule {}
