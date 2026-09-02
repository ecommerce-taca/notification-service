import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { TemplateStatus } from '../enums/template-status.enum';

@Entity('templates')
@Index('uq_templates_key_version_locale', ['key', 'version', 'locale'], { unique: true })
@Index('idx_templates_key_status', ['key', 'status'])
export class Template {
  @PrimaryColumn({ name: '_id', type: 'varchar', length: 36 })
  id: string;

  @Column({ type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'varchar', length: 16 })
  locale: string;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'enum', enum: TemplateStatus })
  status: TemplateStatus;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;
}
