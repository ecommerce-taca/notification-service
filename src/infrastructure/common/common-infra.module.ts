import { Global, Module } from '@nestjs/common';
import { Clock } from '../../domain/ports/clock.port';
import { IdGenerator } from '../../domain/ports/id-generator.port';
import { SystemClock } from './system.clock';
import { UuidV7IdGenerator } from './uuidv7.id-generator';

@Global()
@Module({
  providers: [
    { provide: Clock, useClass: SystemClock },
    { provide: IdGenerator, useClass: UuidV7IdGenerator },
  ],
  exports: [Clock, IdGenerator],
})
export class CommonInfraModule {}
