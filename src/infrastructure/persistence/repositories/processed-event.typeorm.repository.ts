import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcessedEvent } from '../../../domain/entities/processed-event.entity';
import { ProcessedEventRepositoryPort } from '../../../domain/ports/processed-event.repository.port';

@Injectable()
export class ProcessedEventTypeOrmRepository implements ProcessedEventRepositoryPort {
  constructor(
    @InjectRepository(ProcessedEvent)
    private readonly repo: Repository<ProcessedEvent>,
  ) {}

  async existsByEventId(eventId: string): Promise<boolean> {
    const count = await this.repo.count({ where: { eventId } });
    return count > 0;
  }

  async save(event: ProcessedEvent): Promise<ProcessedEvent> {
    return this.repo.save(event);
  }
}
