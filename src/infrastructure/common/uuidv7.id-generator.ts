import { Injectable } from '@nestjs/common';
import { uuidv7 } from '../../common/id/uuidv7';
import { IdGenerator } from '../../domain/ports/id-generator.port';

@Injectable()
export class UuidV7IdGenerator implements IdGenerator {
  generate(): string {
    return uuidv7();
  }
}
