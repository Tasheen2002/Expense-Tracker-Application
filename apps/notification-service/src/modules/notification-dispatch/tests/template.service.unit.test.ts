import { describe, expect, it, vi } from 'vitest';
import { TemplateService } from '../application/services/template.service';
import { INotificationTemplateRepository } from '../domain/repositories/notification-template.repository';
import { TemplateAccess } from '../application/services/template-access';
import { UserId, WorkspaceId, TemplateId } from '../domain/value-objects';
import { NotificationType, NotificationChannel } from '../domain/enums';
import { TemplateAccessDeniedError, InvalidNotificationDataError } from '../domain/errors/notification.errors';

const access: TemplateAccess = { userId: UserId.create().getValue(), workspaceId: WorkspaceId.create().getValue(), role: 'ADMIN' };
const input = { workspaceId: access.workspaceId, name: 'Template', type: NotificationType.SYSTEM_ALERT,
  channel: NotificationChannel.EMAIL, subjectTemplate: 'Subject', bodyTemplate: 'Body' };
function setup() {
  const repository: INotificationTemplateRepository = {
    save: vi.fn(), mutate: vi.fn(), findById: vi.fn(), findActiveTemplate: vi.fn(),
  };
  return { repository, service: new TemplateService(repository) };
}

describe('Template service application boundaries', () => {
  it('requires verified administrator context for reads and writes before repository access', async () => {
    const { service, repository } = setup(); const member = { ...access, role: 'MEMBER' };
    const id = TemplateId.create().getValue();
    for (const operation of [() => service.createTemplate(input, member),
      () => service.getTemplateById(id, member),
      () => service.getActiveTemplate(access.workspaceId, input.type, input.channel, member),
      () => service.updateTemplate(id, {}, member), () => service.activateTemplate(id, member),
      () => service.deactivateTemplate(id, member)]) {
      await expect(operation()).rejects.toBeInstanceOf(TemplateAccessDeniedError);
    }
    for (const method of Object.values(repository)) expect(method).not.toHaveBeenCalled();
  });

  it('rejects malformed template IDs before repository access', async () => {
    const { service, repository } = setup();
    await expect(service.getTemplateById('invalid', access)).rejects.toThrow();
    await expect(service.activateTemplate('invalid', access)).rejects.toThrow();
    expect(repository.findById).not.toHaveBeenCalled(); expect(repository.mutate).not.toHaveBeenCalled();
  });

  it('rejects invalid raw update input with a domain error before sanitization or mutation', async () => {
    const { service, repository } = setup();
    // @ts-expect-error Exercise an untyped caller.
    await expect(service.updateTemplate(TemplateId.create().getValue(), { bodyTemplate: 12 }, access))
      .rejects.toBeInstanceOf(InvalidNotificationDataError);
    expect(repository.mutate).not.toHaveBeenCalled();
  });

  it('does not hide unexpected persistence failures', async () => {
    const { service, repository } = setup();
    vi.mocked(repository.save).mockRejectedValue(new Error('database unavailable'));
    await expect(service.createTemplate(input, access)).rejects.toThrow('database unavailable');
    vi.mocked(repository.mutate).mockRejectedValue(new Error('write failed'));
    await expect(service.deactivateTemplate(TemplateId.create().getValue(), access)).rejects.toThrow('write failed');
  });

  it('rejects invalid creation content instead of calling the sanitizer with a non-string', async () => {
    const { service, repository } = setup();
    // @ts-expect-error Exercise an untyped caller.
    await expect(service.createTemplate({ ...input, subjectTemplate: null }, access)).rejects.toBeInstanceOf(InvalidNotificationDataError);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
