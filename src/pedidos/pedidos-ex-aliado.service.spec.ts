import { BadGatewayException } from '@nestjs/common';
import { DatabricksService } from '../databricks/databricks.service';
import { PedidosService } from './pedidos.service';

describe('PedidosService.findExAliadoEmails', () => {
  const executeQuery = jest.fn();
  const service = new PedidosService({
    executeQuery,
  } as unknown as DatabricksService);

  beforeEach(() => executeQuery.mockReset().mockResolvedValue([]));

  it('queries a unique normalized batch, uses current customers and restricts order statuses to 2 and 241', async () => {
    executeQuery.mockResolvedValue([
      { email: 'a@example.com' },
      { email: 'b@example.com' },
    ]);
    const result = await service.findExAliadoEmails([
      ' A@Example.com ',
      'a@example.com',
      'b@example.com',
      null,
      undefined,
      '  ',
    ]);
    expect(result).toEqual(new Set(['a@example.com', 'b@example.com']));
    expect(executeQuery).toHaveBeenCalledTimes(1);
    const [sql, parameters] = executeQuery.mock.calls[0] as [string, object];
    expect(parameters).toEqual({
      email_0: 'a@example.com',
      email_1: 'b@example.com',
    });
    expect(sql).toContain('p.pedido_status IN (2, 241)');
    expect(sql).toContain(
      'LOWER(TRIM(c.pessoa_email)) IN (:email_0, :email_1)',
    );
    expect(sql).toContain(
      'INNER JOIN clientes_atuais c ON c.id = p.cliente_id',
    );
    expect(sql).toContain('data_lake_imperio.default.pedidosdlt');
    expect(sql).toContain('data_lake_imperio.default.pessoasdlt');
    expect(sql).toContain('PARTITION BY id');
    expect(sql).toContain(
      'COALESCE(ultima_atualizacao, modificado, criado) DESC NULLS LAST',
    );
    expect(sql.indexOf('QUALIFY')).toBeLessThan(
      sql.indexOf('LOWER(TRIM(c.pessoa_email)) IN'),
    );
    expect(sql).not.toContain('LIMIT');
    expect(sql).not.toContain('OFFSET');
  });

  it.each([{ emails: [] }, { emails: [null, undefined, '', ' '] }])(
    'skips the data lake for a batch without email (%j)',
    async ({ emails }) => {
      await expect(service.findExAliadoEmails(emails)).resolves.toEqual(
        new Set(),
      );
      expect(executeQuery).not.toHaveBeenCalled();
    },
  );

  it('binds untrusted emails without interpolating them into SQL', async () => {
    const email = "lead' OR 1=1 --@example.com";
    await service.findExAliadoEmails([email]);
    expect(executeQuery.mock.calls[0][0]).not.toContain(email);
    expect(executeQuery.mock.calls[0][1]).toEqual({
      email_0: email.toLowerCase(),
    });
  });

  it('returns an empty set when no qualifying order exists', async () => {
    await expect(
      service.findExAliadoEmails(['lead@example.com']),
    ).resolves.toEqual(new Set());
  });

  it('propagates data lake errors instead of treating all emails as unmatched', async () => {
    const error = new BadGatewayException('Data lake indisponivel.');
    executeQuery.mockRejectedValue(error);
    await expect(service.findExAliadoEmails(['lead@example.com'])).rejects.toBe(
      error,
    );
  });
});
