import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../database/entities/system/audit-log.entity';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';

export interface RecordAuditLogInput {
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  async list(query: ListAuditLogsQueryDto) {
    const page = this.parsePositiveInt(query.page, 1);
    const pageSize = Math.min(this.parsePositiveInt(query.pageSize, 50), 200);
    const qb = this.auditLogRepo
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.user', 'user')
      .orderBy('audit.createdAt', 'DESC')
      .addOrderBy('audit.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (query.userId?.trim()) {
      qb.andWhere('audit.userId = :userId', {
        userId: this.parseUuid(query.userId, 'userId'),
      });
    }
    if (query.action?.trim()) {
      qb.andWhere('audit.action = :action', {
        action: query.action.trim(),
      });
    }
    if (query.resource?.trim()) {
      qb.andWhere('audit.resource = :resource', {
        resource: query.resource.trim(),
      });
    }
    if (query.resourceId?.trim()) {
      qb.andWhere('audit.resourceId = :resourceId', {
        resourceId: query.resourceId.trim(),
      });
    }
    if (query.dateFrom?.trim()) {
      qb.andWhere('audit.createdAt >= :dateFrom', {
        dateFrom: this.parseDate(query.dateFrom, 'dateFrom'),
      });
    }
    if (query.dateTo?.trim()) {
      qb.andWhere('audit.createdAt <= :dateTo', {
        dateTo: this.parseDate(query.dateTo, 'dateTo'),
      });
    }

    const [items, total] = await qb.getManyAndCount();
    return {
      items: items.map((item) => this.mapAuditLog(item)),
      total,
      page,
      pageSize,
    };
  }

  async record(input: RecordAuditLogInput): Promise<void> {
    await this.auditLogRepo.save(
      this.auditLogRepo.create({
        userId: input.userId ?? null,
        action: this.truncate(input.action, 120),
        resource: this.truncate(input.resource, 120),
        resourceId: input.resourceId
          ? this.truncate(input.resourceId, 120)
          : null,
        metadata: input.metadata ?? null,
        ip: input.ip ? this.truncate(input.ip, 80) : null,
      }),
    );
  }

  async recordSafe(input: RecordAuditLogInput): Promise<void> {
    try {
      await this.record(input);
    } catch {
      // Audit logging must not block the business operation.
    }
  }

  private mapAuditLog(item: AuditLog) {
    return {
      id: item.id,
      userId: item.userId ?? null,
      user: item.user
        ? {
            id: item.user.id,
            name: item.user.name,
            email: item.user.email,
          }
        : null,
      action: item.action,
      resource: item.resource,
      resourceId: item.resourceId ?? null,
      metadata: item.metadata ?? null,
      ip: item.ip ?? null,
      createdAt: item.createdAt.toISOString(),
    };
  }

  private parsePositiveInt(value: unknown, fallback: number): number {
    const parsed = Number(value ?? fallback);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private parseUuid(value: string, field: string): string {
    const normalized = value.trim();
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        normalized,
      )
    ) {
      throw new BadRequestException(`${field} deve ser um UUID valido.`);
    }
    return normalized;
  }

  private parseDate(value: string, field: string): Date {
    const date = new Date(value.trim());
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} deve ser uma data valida.`);
    }
    return date;
  }

  private truncate(value: string, max: number): string {
    return value.length > max ? value.slice(0, max) : value;
  }
}
