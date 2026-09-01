import { Template } from '../entities/template.entity';

export abstract class TemplateRepositoryPort {
  abstract findByKeyVersionLocale(key: string, version: number, locale: string): Promise<Template | null>;
  abstract findLatestPublished(key: string, locale: string): Promise<Template | null>;
  abstract findPublishedByKeys(keys: string[], locale: string): Promise<Template[]>;
  abstract save(template: Template): Promise<Template>;
}
