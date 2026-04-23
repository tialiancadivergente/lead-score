import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  GetLeadScoreQuestionsResponseDto,
  LeadScoreQuestionDto,
} from '../dto/get-lead-score-questions.dto';
import { FormVersion } from '../../database/entities/form/form-version.entity';
import { FormVersionQuestion } from '../../database/entities/form/form-version-question.entity';
import { Leadscore } from '../../database/entities/leadscore/leadscore.entity';

type RawQuestionRow = {
  question_id: string;
  question_key: string;
  question_text: string | null;
  input_type: string | null;
  question_display_order: number;
  question_required: boolean;
  option_id: string | null;
  option_key: string | null;
  option_text: string | null;
  option_display_order: number | null;
  option_points: number | null;
};

@Injectable()
export class LeadScoreQuestionsService {
  constructor(
    @InjectRepository(FormVersion)
    private readonly formVersionRepo: Repository<FormVersion>,
    @InjectRepository(FormVersionQuestion)
    private readonly formVersionQuestionRepo: Repository<FormVersionQuestion>,
    @InjectRepository(Leadscore)
    private readonly leadscoreRepo: Repository<Leadscore>,
  ) {}

  async listByFormVersion(
    formVersionId: string,
  ): Promise<GetLeadScoreQuestionsResponseDto> {
    const formVersion = await this.formVersionRepo.findOne({
      where: { id: formVersionId },
    });
    if (!formVersion) {
      throw new NotFoundException(
        `FormVersion não encontrada para id=${formVersionId}.`,
      );
    }

    const activeLeadscore = await this.leadscoreRepo
      .createQueryBuilder('leadscore')
      .leftJoin('leadscore.form_version', 'formVersion')
      .where('formVersion.id = :formVersionId', { formVersionId })
      .andWhere('leadscore.active = true')
      .orderBy('leadscore.created_at', 'DESC')
      .getOne();

    const rows = (await this.formVersionQuestionRepo.query(
      `
      SELECT
        q.id AS question_id,
        q.question_key AS question_key,
        q.question_text AS question_text,
        q.input_type AS input_type,
        fvq.display_order AS question_display_order,
        fvq.required AS question_required,
        qo.id AS option_id,
        qo.option_key AS option_key,
        qo.option_text AS option_text,
        qo.display_order AS option_display_order,
        lop.points AS option_points
      FROM form_version_question fvq
      INNER JOIN question q
        ON q.id = fvq.question_id
      LEFT JOIN question_option qo
        ON qo.question_id = q.id
      LEFT JOIN leadscore_option_points lop
        ON lop.question_id = q.id
       AND lop.option_id = qo.id
       AND lop.leadscore_id = $2
      WHERE fvq.form_version_id = $1
      ORDER BY fvq.display_order ASC, qo.display_order ASC
      `,
      [formVersionId, activeLeadscore?.id ?? null],
    )) as RawQuestionRow[];

    const questionMap = new Map<string, LeadScoreQuestionDto>();

    for (const row of rows) {
      if (!questionMap.has(row.question_id)) {
        questionMap.set(row.question_id, {
          question_id: row.question_id,
          question_key: row.question_key,
          question_text: row.question_text ?? undefined,
          input_type: row.input_type ?? undefined,
          display_order: Number(row.question_display_order ?? 0),
          required: Boolean(row.question_required),
          options: [],
        });
      }

      if (row.option_id) {
        const optionKey = row.option_key ?? '';
        const optionPoints =
          row.option_points === null || row.option_points === undefined
            ? undefined
            : Number(row.option_points);

        questionMap.get(row.question_id)!.options.push({
          option_id: row.option_id,
          option_key: optionKey,
          option_text: row.option_text ?? undefined,
          answer_value:
            optionPoints === undefined ? undefined : row.option_text ?? optionKey,
          points: optionPoints,
          display_order: Number(row.option_display_order ?? 0),
        });
      }
    }

    return {
      form_version_id: formVersionId,
      questions: Array.from(questionMap.values()),
    };
  }
}
