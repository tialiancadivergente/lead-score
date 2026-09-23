import { BadRequestException } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';

describe('AuditLogService', () => {
  const createRepository = () => ({
    createQueryBuilder: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(),
  });

  it('records a normalized audit log entry', async () => {
    const repo = createRepository();
    const service = new AuditLogService(repo as never);

    await service.record({
      userId: '00000000-0000-4000-8000-000000000001',
      action: 'login_success',
      resource: 'auth',
      ip: '127.0.0.1',
      metadata: { email: 'user@example.com' },
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'login_success',
        resource: 'auth',
        ip: '127.0.0.1',
      }),
    );
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid userId filter', async () => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };
    const repo = createRepository();
    repo.createQueryBuilder.mockReturnValue(qb);
    const service = new AuditLogService(repo as never);

    await expect(service.list({ userId: 'invalid' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
