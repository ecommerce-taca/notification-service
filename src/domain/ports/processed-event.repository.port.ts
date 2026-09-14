import { ProcessedEvent } from '../entities/processed-event.entity';

export abstract class ProcessedEventRepositoryPort {
  abstract existsByEventId(eventId: string): Promise<boolean>;
  abstract save(event: ProcessedEvent): Promise<ProcessedEvent>;
}
