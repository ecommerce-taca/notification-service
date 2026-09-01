import { TemplateService } from './template.service';
import { TemplateRepositoryPort } from '../../domain/ports/template.repository.port';
import { Template } from '../../domain/entities/template.entity';
import { TemplateStatus } from '../../domain/enums/template-status.enum';

function makeTemplate(overrides: Partial<Template> = {}): Template {
  const template = new Template();
  Object.assign(template, {
    id: 'tpl-1',
    key: 'order-success-v1',
    version: 1,
    locale: 'vi-VN',
    subject: 'Đặt hàng {{order_code}}',
    body: 'Đơn {{order_code}} của {{display_name}}',
    status: TemplateStatus.PUBLISHED,
    createdAt: new Date(),
    ...overrides,
  });
  return template;
}

describe('TemplateService', () => {
  let templateRepo: jest.Mocked<TemplateRepositoryPort>;
  let service: TemplateService;

  beforeEach(() => {
    templateRepo = {
      findByKeyVersionLocale: jest.fn(),
      findLatestPublished: jest.fn(),
      findPublishedByKeys: jest.fn(),
      save: jest.fn(),
    } as jest.Mocked<TemplateRepositoryPort>;
    service = new TemplateService(templateRepo);
  });

  it('should render subject and body with data', () => {
    const rendered = service.render(makeTemplate(), { order_code: 'TC-1', display_name: 'Minh Anh' });
    expect(rendered.title).toBe('Đặt hàng TC-1');
    expect(rendered.body).toBe('Đơn TC-1 của Minh Anh');
  });

  it('should HTML-escape values to prevent XSS', () => {
    const rendered = service.render(makeTemplate({ body: '{{display_name}}' }), {
      display_name: '<script>alert(1)</script>',
    });
    expect(rendered.body).not.toContain('<script>');
    expect(rendered.body).toContain('&lt;script&gt;');
  });

  it('should drop fields outside the template allowlist', () => {
    const filtered = service.pickAllowedFields(makeTemplate(), { order_code: 'TC-1', secret_token: 'abc' });
    expect(filtered).toEqual({ order_code: 'TC-1' });
  });

  it('should throw when template not found', async () => {
    templateRepo.findByKeyVersionLocale.mockResolvedValue(null);
    await expect(service.resolve('missing', 1, 'vi-VN')).rejects.toMatchObject({
      code: 'NOTIFICATION_TEMPLATE_NOT_FOUND',
    });
  });

  it('should resolve latest published version by key', async () => {
    templateRepo.findLatestPublished.mockResolvedValue(makeTemplate());
    const template = await service.resolveByKey('order-success-v1', 'vi-VN');
    expect(template.key).toBe('order-success-v1');
  });
});
