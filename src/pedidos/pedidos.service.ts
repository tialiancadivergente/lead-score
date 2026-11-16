import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabricksService } from '../databricks/databricks.service';

type JsonValue =
  null | string | number | boolean | JsonValue[] | { [key: string]: JsonValue };

interface PedidoPaginado {
  total: number | string | bigint;
  tem_registro: boolean | null;
  registro: Record<string, unknown> | null;
  cliente?: Record<string, unknown> | null;
}

function serialize(value: unknown): JsonValue {
  if (value === null || value === undefined) return null;
  if (Buffer.isBuffer(value)) return value.toString('base64');
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, serialize(item)]),
    );
  }
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
    return value;
  throw new TypeError('Tipo de dado nao suportado na resposta do Databricks.');
}

@Injectable()
export class PedidosService {
  constructor(private readonly databricksService: DatabricksService) {}

  async findExAliadoEmails(
    emails: Array<string | null | undefined>,
  ): Promise<Set<string>> {
    const normalized = [
      ...new Set(
        emails
          .map((email) => email?.trim().toLowerCase())
          .filter((email): email is string => Boolean(email)),
      ),
    ];
    if (!normalized.length) return new Set();

    const parameters: Record<string, string> = {};
    const placeholders = normalized.map((email, index) => {
      const key = `email_${index}`;
      parameters[key] = email;
      return `:${key}`;
    });

    // Escolha a versao atual ANTES do filtro de email, igual ao cliente de /pedidos.
    // Qualquer pedido elegivel basta; nao se limita a uma pagina ou periodo de pedidos.
    const rows = await this.databricksService.executeQuery<{ email: string }>(
      `WITH clientes_atuais AS (
         SELECT id, pessoa_email
         FROM data_lake_imperio.default.pessoasdlt
         QUALIFY ROW_NUMBER() OVER (
           PARTITION BY id
           ORDER BY COALESCE(ultima_atualizacao, modificado, criado) DESC NULLS LAST
         ) = 1
       )
       SELECT DISTINCT LOWER(TRIM(c.pessoa_email)) AS email
       FROM data_lake_imperio.default.pedidosdlt p
       INNER JOIN clientes_atuais c ON c.id = p.cliente_id
       WHERE p.pedido_status IN (2, 241)
         AND LOWER(TRIM(c.pessoa_email)) IN (${placeholders.join(', ')})`,
      parameters,
    );
    return new Set(rows.map((row) => row.email.trim().toLowerCase()));
  }

  async listar(page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      !Number.isSafeInteger(offset)
    ) {
      throw new BadRequestException(
        'page deve ser um inteiro positivo e limit deve estar entre 1 e 100.',
      );
    }

    // Contrato SQL do api-backoffice: todas as colunas e apenas clientes da pagina.
    const rows = await this.databricksService.executeQuery<PedidoPaginado>(
      `WITH pagina AS (
         SELECT TRUE AS tem_registro, STRUCT(t.*) AS registro,
                t.id AS id_ordenacao, t.criado AS criado_ordenacao
         FROM data_lake_imperio.default.pedidosdlt t
         ORDER BY t.criado DESC NULLS LAST, t.id DESC
         LIMIT :limit OFFSET :offset
       ), total AS (
         SELECT COUNT(*) AS quantidade FROM data_lake_imperio.default.pedidosdlt
       ), clientes AS (
         SELECT * FROM data_lake_imperio.default.pessoasdlt
         WHERE id IN (SELECT registro.cliente_id FROM pagina)
         QUALIFY ROW_NUMBER() OVER (
           PARTITION BY id
           ORDER BY COALESCE(ultima_atualizacao, modificado, criado) DESC NULLS LAST
         ) = 1
       )
       SELECT total.quantidade AS total, pagina.tem_registro, pagina.registro,
              CASE WHEN c.id IS NOT NULL THEN STRUCT(c.*) ELSE NULL END AS cliente
       FROM total LEFT JOIN pagina ON TRUE
       LEFT JOIN clientes c ON c.id = pagina.registro.cliente_id
       ORDER BY pagina.criado_ordenacao DESC NULLS LAST, pagina.id_ordenacao DESC`,
      { limit, offset },
    );
    const total = Number(rows[0]?.total ?? 0);
    const totalPages = Math.ceil(total / limit);
    return {
      data: rows.flatMap((row) =>
        row.tem_registro && row.registro
          ? [serialize({ ...row.registro, cliente: row.cliente ?? null })]
          : [],
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
      },
      consultadoEm: new Date().toISOString(),
    };
  }
}
