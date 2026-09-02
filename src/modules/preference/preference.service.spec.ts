import { PreferenceService } from './preference.service';
import { PreferenceRepositoryPort } from '../../domain/ports/preference.repository.port';
import { IdGenerator } from '../../domain/ports/id-generator.port';
import { NotificationPreference } from '../../domain/entities/notification-preference.entity';
import { Channel } from '../../domain/enums/channel.enum';
import { NotificationCategory } from '../../domain/enums/category.enum';
import { PreferenceStatus } from '../../domain/enums/preference-status.enum';

function makePreference(overrides: Partial<NotificationPreference> = {}): NotificationPreference {
  const pref = new NotificationPreference();
  Object.assign(pref, {
    id: 'pref-1',
    userId: 'user-1',
    channel: Channel.EMAIL,
    category: NotificationCategory.ORDER,
    status: PreferenceStatus.ENABLED,
    locked: false,
    version: 1,
    updatedAt: new Date(),
    ...overrides,
  });
  return pref;
}

describe('PreferenceService', () => {
  let repo: jest.Mocked<PreferenceRepositoryPort>;
  let idGenerator: jest.Mocked<IdGenerator>;
  let service: PreferenceService;

  beforeEach(() => {
    repo = {
      findByUser: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    } as jest.Mocked<PreferenceRepositoryPort>;
    idGenerator = { generate: jest.fn().mockReturnValue('pref-new') } as jest.Mocked<IdGenerator>;
    service = new PreferenceService(repo, idGenerator);
  });

  it('should reject disabling SECURITY category', async () => {
    await expect(
      service.update('user-1', Channel.EMAIL, NotificationCategory.SECURITY, PreferenceStatus.DISABLED),
    ).rejects.toMatchObject({ code: 'NOTIFICATION_PREFERENCE_LOCKED' });
  });

  it('should reject disabling a locked preference', async () => {
    repo.findOne.mockResolvedValue(makePreference({ locked: true, category: NotificationCategory.ORDER }));
    await expect(
      service.update('user-1', Channel.EMAIL, NotificationCategory.ORDER, PreferenceStatus.DISABLED),
    ).rejects.toMatchObject({ code: 'NOTIFICATION_PREFERENCE_LOCKED' });
  });

  it('should create a new SECURITY preference with locked=true', async () => {
    repo.findOne.mockResolvedValue(null);
    repo.save.mockImplementation(async (pref) => pref);
    const result = await service.update('user-1', Channel.EMAIL, NotificationCategory.SECURITY, PreferenceStatus.ENABLED);
    expect(result.locked).toBe(true);
    expect(result.id).toBe('pref-new');
  });

  it('should treat missing preference row as enabled', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.isDisabled('user-1', Channel.EMAIL, NotificationCategory.MARKETING)).resolves.toBe(false);
  });
});
