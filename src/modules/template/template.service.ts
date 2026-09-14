import { Injectable } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import { AppException } from '../../common/errors/app.exception';
import { ErrorCode } from '../../common/errors/error-code';
import { Template } from '../../domain/entities/template.entity';
import { TemplateRepositoryPort } from '../../domain/ports/template.repository.port';

const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export interface RenderedMessage {
  title: string;
  body: string;
}

@Injectable()
export class TemplateService {
  constructor(private readonly templateRepository: TemplateRepositoryPort) {}

  async resolve(key: string, version: number, locale: string): Promise<Template> {
    const template = await this.templateRepository.findByKeyVersionLocale(key, version, locale);
    if (!template) {
      throw new AppException(ErrorCode.NOTIFICATION_TEMPLATE_NOT_FOUND, { context: { key, version, locale } });
    }
    return template;
  }

  // Lấy bản publish mới nhất theo key (command/event chỉ truyền key, không truyền version).
  async resolveByKey(key: string, locale: string): Promise<Template> {
    const template = await this.templateRepository.findLatestPublished(key, locale);
    if (!template) {
      throw new AppException(ErrorCode.NOTIFICATION_TEMPLATE_NOT_FOUND, { context: { key, locale } });
    }
    return template;
  }

  // Allowlist của template = các placeholder trong subject/body.
  placeholders(template: Template): Set<string> {
    const keys = new Set<string>();
    const text = `${template.subject}\n${template.body}`;
    PLACEHOLDER_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = PLACEHOLDER_PATTERN.exec(text)) !== null) {
      keys.add(match[1]);
    }
    return keys;
  }

  // Giữ lại đúng field nằm trong allowlist của template; field ngoài (secret/token/payment)
  // bị loại, không đưa vào render. Đây là lớp chặn "reject field ngoài allowlist".
  pickAllowedFields(template: Template, data: Record<string, unknown>): Record<string, unknown> {
    const allowed = this.placeholders(template);
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (allowed.has(key)) filtered[key] = value;
    }
    return filtered;
  }

  // Handlebars mặc định HTML-escape {{var}} — chặn XSS từ data ngoài.
  render(template: Template, data: Record<string, unknown>): RenderedMessage {
    return {
      title: this.renderText(template.subject, data),
      body: this.renderText(template.body, data),
    };
  }

  // Nạp nhiều template theo key trong 1 query (tránh N+1 khi render danh sách in-app).
  async loadByKeys(keys: string[], locale: string): Promise<Map<string, Template>> {
    const templates = await this.templateRepository.findPublishedByKeys(keys, locale);
    const map = new Map<string, Template>();
    for (const template of templates) {
      if (!map.has(template.key)) map.set(template.key, template);
    }
    return map;
  }

  private renderText(source: string, data: Record<string, unknown>): string {
    return Handlebars.compile(source, { noEscape: false })(data);
  }
}
