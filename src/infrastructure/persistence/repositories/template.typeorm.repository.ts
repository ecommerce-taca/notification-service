import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Template } from '../../../domain/entities/template.entity';
import { TemplateStatus } from '../../../domain/enums/template-status.enum';
import { TemplateRepositoryPort } from '../../../domain/ports/template.repository.port';

@Injectable()
export class TemplateTypeOrmRepository implements TemplateRepositoryPort {
  constructor(
    @InjectRepository(Template)
    private readonly repo: Repository<Template>,
  ) {}

  async findByKeyVersionLocale(key: string, version: number, locale: string): Promise<Template | null> {
    return this.repo.findOne({ where: { key, version, locale } });
  }

  async findLatestPublished(key: string, locale: string): Promise<Template | null> {
    return this.repo.findOne({
      where: { key, locale, status: TemplateStatus.PUBLISHED },
      order: { version: 'DESC' },
    });
  }

  async findPublishedByKeys(keys: string[], locale: string): Promise<Template[]> {
    if (keys.length === 0) return [];
    return this.repo.find({
      where: { key: In(keys), locale, status: TemplateStatus.PUBLISHED },
      order: { version: 'DESC' },
    });
  }

  async save(template: Template): Promise<Template> {
    return this.repo.save(template);
  }
}
