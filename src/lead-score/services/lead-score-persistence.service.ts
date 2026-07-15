import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Capture } from '../../database/entities/capture/capture.entity';
import { FormAnswer } from '../../database/entities/form/form-answer.entity';
import { FormResponse } from '../../database/entities/form/form-response.entity';
import { FormVersion } from '../../database/entities/form/form-version.entity';
import { FormVersionQuestion } from '../../database/entities/form/form-version-question.entity';
import { Question } from '../../database/entities/form/question.entity';
import { QuestionOption } from '../../database/entities/form/question-option.entity';
import { LeadscoreOptionPoints } from '../../database/entities/leadscore/leadscore-option-points.entity';
import { LeadscoreRangePoints } from '../../database/entities/leadscore/leadscore-range-points.entity';
import { LeadscoreResult } from '../../database/entities/leadscore/leadscore-result.entity';
import { LeadscoreTierRule } from '../../database/entities/leadscore/leadscore-tier-rule.entity';
import { Leadscore } from '../../database/entities/leadscore/leadscore.entity';
import { LeadScoreCaptureNotFoundError } from '../errors/lead-score-capture-not-found.error';

type ParsedAnswer = {
  question_id: string;
  option_id?: string;
  answer_text?: string;
  answer_number?: number;
  answer_bool?: boolean;
  answered_at?: string;
};

type LeadScorePersistResult = {
  formResponseId: string;
  leadscoreResultId: string;
  captureId: string;
  scoreTotal: number;
  tierCode?: string;
  reused: boolean;
};

@Injectable()
export class LeadScorePersistenceService {
  constructor(
    @InjectRepository(FormResponse)
    private readonly formResponseRepo: Repository<FormResponse>,
  ) {}

  private pickNonEmptyTrimmedString(
    obj: Record<string, unknown>,
    key: string,
  ): string | undefined {
    const v = obj?.[key];
    if (typeof v !== 'string') return undefined;
    const trimmed = v.trim();
    return trimmed ? trimmed : undefined;
  }

  private parseDate(value: unknown, fallback: Date): Date {
    if (typeof value !== 'string') return fallback;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed;
  }

  private parseAnswers(payloadObj: Record<string, unknown>): ParsedAnswer[] {
    const answersRaw = payloadObj.answers;
    if (!Array.isArray(answersRaw) || answersRaw.length === 0) {
      throw new Error('Campo obrigatório ausente/inválido: answers.');
    }

    return answersRaw.map((a, idx) => {
      if (!a || typeof a !== 'object') {
        throw new Error(`answers[${idx}] inválido: esperado objeto.`);
      }

      const answer = a as Record<string, unknown>;
      const questionId = this.pickNonEmptyTrimmedString(answer, 'question_id');
      if (!questionId) {
        throw new Error(
          `Campo obrigatório ausente/inválido: answers[${idx}].question_id.`,
        );
      }

      const optionId = this.pickNonEmptyTrimmedString(answer, 'option_id');
      const answerText = this.pickNonEmptyTrimmedString(answer, 'answer_text');
      const answerNumberRaw = answer.answer_number;
      const answerBoolRaw = answer.answer_bool;

      const hasNumber =
        typeof answerNumberRaw === 'number' && Number.isFinite(answerNumberRaw);
      const hasBool = typeof answerBoolRaw === 'boolean';

      const kinds = [
        Boolean(optionId),
        Boolean(answerText),
        hasNumber,
        hasBool,
      ].filter(Boolean).length;

      if (kinds !== 1) {
        throw new Error(
          `answers[${idx}] deve conter exatamente um valor de resposta entre option_id, answer_text, answer_number, answer_bool.`,
        );
      }

      const parsed: ParsedAnswer = {
        question_id: questionId,
        option_id: optionId,
        answer_text: answerText,
        answer_number: hasNumber ? answerNumberRaw : undefined,
        answer_bool: hasBool ? answerBoolRaw : undefined,
        answered_at: this.pickNonEmptyTrimmedString(answer, 'answered_at'),
      };

      return parsed;
    });
  }

  private async resolveCapture(
    payloadObj: Record<string, unknown>,
    captureRepo: Repository<Capture>,
  ): Promise<Capture> {
    const captureId = this.pickNonEmptyTrimmedString(payloadObj, 'capture_id');
    const leadRegistrationRequestId = this.pickNonEmptyTrimmedString(
      payloadObj,
      'lead_registration_request_id',
    );

    if (!captureId && !leadRegistrationRequestId) {
      throw new Error('Informe capture_id ou lead_registration_request_id.');
    }

    let capture: Capture | null = null;

    if (captureId) {
      capture = await captureRepo.findOne({
        where: { id: captureId },
        relations: ['person', 'form_version'],
      });
      if (!capture && !leadRegistrationRequestId) {
        throw new LeadScoreCaptureNotFoundError(
          `Capture não encontrada para id=${captureId}.`,
          { captureId },
        );
      }
    }

    if (!capture && leadRegistrationRequestId) {
      capture = await captureRepo
        .createQueryBuilder('capture')
        .leftJoinAndSelect('capture.person', 'person')
        .leftJoinAndSelect('capture.form_version', 'form_version')
        .where("capture.metadata ->> 'requestId' = :requestId", {
          requestId: leadRegistrationRequestId,
        })
        .orderBy('capture.created_at', 'DESC')
        .getOne();

      if (!capture) {
        capture = await captureRepo
          .createQueryBuilder('capture')
          .leftJoinAndSelect('capture.person', 'person')
          .leftJoinAndSelect('capture.form_version', 'form_version')
          .where(
            "capture.metadata -> 'leadRegistrationRequestIds' ? :requestId",
            {
              requestId: leadRegistrationRequestId,
            },
          )
          .orderBy('capture.created_at', 'DESC')
          .getOne();
      }
    }

    if (!capture) {
      throw new LeadScoreCaptureNotFoundError(
        'Capture não encontrada para os identificadores informados.',
        { captureId, leadRegistrationRequestId },
      );
    }

    return capture;
  }

  private validateAnswerByInputType(
    answer: ParsedAnswer,
    inputType?: string,
    idx?: number,
  ) {
    const label = typeof idx === 'number' ? `answers[${idx}]` : 'answer';
    const normalized = (inputType ?? '').toLowerCase();

    if (!normalized || normalized === 'single' || normalized === 'multi') {
      if (!answer.option_id) {
        throw new Error(`${label} exige option_id para pergunta de opção.`);
      }
      return;
    }

    if (
      normalized === 'text' ||
      normalized === 'open' ||
      normalized === 'date'
    ) {
      if (!answer.answer_text) {
        throw new Error(
          `${label} exige answer_text para pergunta ${normalized}.`,
        );
      }
      return;
    }

    if (normalized === 'number') {
      if (typeof answer.answer_number !== 'number') {
        throw new Error(`${label} exige answer_number para pergunta number.`);
      }
      return;
    }

    if (normalized === 'bool' || normalized === 'boolean') {
      if (typeof answer.answer_bool !== 'boolean') {
        throw new Error(`${label} exige answer_bool para pergunta bool.`);
      }
      return;
    }
  }

  private buildRawPayload(
    payloadObj: Record<string, unknown>,
    requestId?: string,
    captureId?: string,
  ): Record<string, any> {
    const existingRaw =
      payloadObj.raw_payload && typeof payloadObj.raw_payload === 'object'
        ? (payloadObj.raw_payload as Record<string, any>)
        : {};

    return {
      ...existingRaw,
      requestId,
      captureId,
      formVersionId: payloadObj.form_version_id,
      leadRegistrationRequestId: payloadObj.lead_registration_request_id,
      payload: payloadObj,
    };
  }

  async persistLeadScore(payload: unknown): Promise<LeadScorePersistResult> {
    const payloadObj =
      payload && typeof payload === 'object'
        ? (payload as Record<string, unknown>)
        : ({} as Record<string, unknown>);

    const formVersionId = this.pickNonEmptyTrimmedString(
      payloadObj,
      'form_version_id',
    );
    if (!formVersionId) {
      throw new Error('Campo obrigatório ausente/inválido: form_version_id.');
    }

    const requestIdRaw = payloadObj.requestId;
    const requestId =
      typeof requestIdRaw === 'string' ? requestIdRaw : undefined;

    const answers = this.parseAnswers(payloadObj);

    return await this.formResponseRepo.manager.transaction(async (manager) => {
      const captureRepo = manager.getRepository(Capture);
      const formVersionRepo = manager.getRepository(FormVersion);
      const formVersionQuestionRepo =
        manager.getRepository(FormVersionQuestion);
      const questionOptionRepo = manager.getRepository(QuestionOption);
      const formResponseRepo = manager.getRepository(FormResponse);
      const formAnswerRepo = manager.getRepository(FormAnswer);
      const leadscoreRepo = manager.getRepository(Leadscore);
      const leadscoreOptionPointsRepo = manager.getRepository(
        LeadscoreOptionPoints,
      );
      const leadscoreRangePointsRepo =
        manager.getRepository(LeadscoreRangePoints);
      const leadscoreTierRuleRepo = manager.getRepository(LeadscoreTierRule);
      const leadscoreResultRepo = manager.getRepository(LeadscoreResult);

      if (requestId) {
        const existingResponse = await formResponseRepo
          .createQueryBuilder('fr')
          .where("fr.raw_payload ->> 'requestId' = :requestId", { requestId })
          .orderBy('fr.created_at', 'DESC')
          .getOne();

        if (existingResponse) {
          const existingResult = await leadscoreResultRepo.findOne({
            where: { form_response: { id: existingResponse.id } },
            relations: ['tier'],
          });

          if (existingResult) {
            return {
              formResponseId: existingResponse.id,
              leadscoreResultId: existingResult.id,
              captureId:
                (existingResponse.capture && existingResponse.capture.id) ||
                this.pickNonEmptyTrimmedString(payloadObj, 'capture_id') ||
                'unknown',
              scoreTotal: existingResult.score_total ?? 0,
              tierCode: existingResult.tier?.code,
              reused: true,
            };
          }
        }
      }

      const capture = await this.resolveCapture(payloadObj, captureRepo);

      const formVersion = await formVersionRepo.findOne({
        where: { id: formVersionId, active: true },
      });
      if (!formVersion) {
        throw new Error(
          `FormVersion não encontrada/ativa para id=${formVersionId}.`,
        );
      }

      if (!capture.form_version || capture.form_version.id !== formVersion.id) {
        capture.form_version = formVersion;
        await captureRepo.save(capture);
      }

      const versionQuestions = await formVersionQuestionRepo
        .createQueryBuilder('fvq')
        .leftJoinAndSelect('fvq.question', 'question')
        .where('fvq.form_version_id = :formVersionId', {
          formVersionId: formVersion.id,
        })
        .getMany();

      if (versionQuestions.length === 0) {
        throw new Error(
          `Nenhuma pergunta vinculada ao form_version_id=${formVersion.id}.`,
        );
      }

      const questionMap = new Map<
        string,
        { input_type?: string; required: boolean }
      >();
      for (const row of versionQuestions) {
        questionMap.set(row.question.id, {
          input_type: row.question.input_type,
          required: row.required,
        });
      }

      answers.forEach((answer, idx) => {
        const q = questionMap.get(answer.question_id);
        if (!q) {
          throw new Error(
            `Pergunta não pertence ao form_version informado: answers[${idx}].question_id=${answer.question_id}.`,
          );
        }
        this.validateAnswerByInputType(answer, q.input_type, idx);
      });

      const answeredByQuestion = new Set(answers.map((a) => a.question_id));
      for (const [questionId, meta] of questionMap.entries()) {
        if (meta.required && !answeredByQuestion.has(questionId)) {
          throw new Error(
            `Pergunta obrigatória sem resposta: question_id=${questionId}.`,
          );
        }
      }

      const optionAnswers = answers.filter((a) => Boolean(a.option_id));
      const optionIds = optionAnswers.map((a) => a.option_id!);
      const optionMap = new Map<string, QuestionOption>();
      if (optionIds.length > 0) {
        const options = await questionOptionRepo
          .createQueryBuilder('option')
          .leftJoinAndSelect('option.question', 'question')
          .where('option.id IN (:...optionIds)', { optionIds })
          .getMany();

        for (const option of options) {
          optionMap.set(option.id, option);
        }

        for (let i = 0; i < optionAnswers.length; i++) {
          const answer = optionAnswers[i];
          const option = optionMap.get(answer.option_id!);
          if (!option) {
            throw new Error(
              `Opção não encontrada para answers[${i}].option_id=${answer.option_id}.`,
            );
          }
          if (option.question.id !== answer.question_id) {
            throw new Error(
              `Opção ${answer.option_id} não pertence à pergunta ${answer.question_id}.`,
            );
          }
        }
      }

      const submittedAt = this.parseDate(payloadObj.submitted_at, new Date());
      const formResponseRawPayload = this.buildRawPayload(
        payloadObj,
        requestId,
        capture.id,
      );

      const formResponse = await formResponseRepo.save(
        formResponseRepo.create({
          form_version: formVersion,
          person: capture.person,
          capture,
          submitted_at: submittedAt,
          raw_payload: formResponseRawPayload,
        }),
      );

      const formAnswersToSave = answers.map((answer) => {
        const question = { id: answer.question_id } as Question;
        const option = answer.option_id
          ? ({ id: answer.option_id } as QuestionOption)
          : undefined;

        return formAnswerRepo.create({
          form_response: formResponse,
          question,
          option,
          answer_text: answer.answer_text,
          answer_number: answer.answer_number,
          answer_bool: answer.answer_bool,
          answered_at: this.parseDate(answer.answered_at, submittedAt),
        });
      });

      await formAnswerRepo.save(formAnswersToSave);

      const leadscore = await leadscoreRepo
        .createQueryBuilder('leadscore')
        .leftJoinAndSelect('leadscore.form_version', 'formVersion')
        .where('formVersion.id = :formVersionId', {
          formVersionId: formVersion.id,
        })
        .andWhere('leadscore.active = true')
        .orderBy('leadscore.created_at', 'DESC')
        .getOne();

      if (!leadscore) {
        throw new Error(
          `Leadscore ativo não encontrado para form_version_id=${formVersion.id}.`,
        );
      }

      const optionPointRows = optionIds.length
        ? await leadscoreOptionPointsRepo
            .createQueryBuilder('lop')
            .leftJoinAndSelect('lop.option', 'option')
            .leftJoinAndSelect('lop.question', 'question')
            .leftJoin('lop.leadscore', 'leadscore')
            .where('leadscore.id = :leadscoreId', { leadscoreId: leadscore.id })
            .andWhere('option.id IN (:...optionIds)', { optionIds })
            .getMany()
        : [];

      const optionPointMap = new Map<string, number>();
      for (const row of optionPointRows) {
        optionPointMap.set(
          `${row.question.id}::${row.option.id}`,
          row.points ?? 0,
        );
      }

      let scoreTotal = 0;
      const breakdownOptions: Array<Record<string, any>> = [];
      const breakdownRanges: Array<Record<string, any>> = [];

      for (const answer of optionAnswers) {
        const key = `${answer.question_id}::${answer.option_id}`;
        const points = optionPointMap.get(key) ?? 0;
        scoreTotal += points;
        breakdownOptions.push({
          question_id: answer.question_id,
          option_id: answer.option_id,
          points,
        });
      }

      const numberAnswers = answers.filter(
        (a) => typeof a.answer_number === 'number',
      );
      for (const answer of numberAnswers) {
        const value = answer.answer_number!;
        const matchedRange = await leadscoreRangePointsRepo
          .createQueryBuilder('lrp')
          .leftJoin('lrp.question', 'question')
          .leftJoin('lrp.leadscore', 'leadscore')
          .where('leadscore.id = :leadscoreId', { leadscoreId: leadscore.id })
          .andWhere('question.id = :questionId', {
            questionId: answer.question_id,
          })
          .andWhere('(lrp.min_value IS NULL OR lrp.min_value <= :value)', {
            value,
          })
          .andWhere('(lrp.max_value IS NULL OR :value < lrp.max_value)', {
            value,
          })
          .orderBy('lrp.min_value', 'DESC')
          .getOne();

        const points = matchedRange?.points ?? 0;
        scoreTotal += points;

        breakdownRanges.push({
          question_id: answer.question_id,
          value,
          min_value: matchedRange?.min_value,
          max_value: matchedRange?.max_value,
          points,
        });
      }

      const tierRule = await leadscoreTierRuleRepo
        .createQueryBuilder('rule')
        .leftJoinAndSelect('rule.tier', 'tier')
        .leftJoin('rule.leadscore', 'leadscore')
        .where('leadscore.id = :leadscoreId', { leadscoreId: leadscore.id })
        .andWhere('(rule.min_score IS NULL OR rule.min_score <= :score)', {
          score: scoreTotal,
        })
        .andWhere('(rule.max_score IS NULL OR :score < rule.max_score)', {
          score: scoreTotal,
        })
        .orderBy('rule.min_score', 'DESC')
        .getOne();

      const leadscoreResult = await leadscoreResultRepo.save(
        leadscoreResultRepo.create({
          leadscore,
          form_response: formResponse,
          score_total: scoreTotal,
          tier: tierRule?.tier,
          breakdown: {
            options: breakdownOptions,
            ranges: breakdownRanges,
            total: scoreTotal,
          },
          calculated_at: new Date(),
        }),
      );

      return {
        formResponseId: formResponse.id,
        leadscoreResultId: leadscoreResult.id,
        captureId: capture.id,
        scoreTotal,
        tierCode: tierRule?.tier?.code,
        reused: false,
      };
    });
  }

  async attachActiveCampaign(
    captureId: string,
    activeCampaignResponse: Record<string, any>,
  ) {
    const capture = await this.formResponseRepo.manager
      .getRepository(Capture)
      .findOne({ where: { id: captureId } });
    if (!capture) return { updated: false };

    const prev =
      capture.metadata && typeof capture.metadata === 'object'
        ? (capture.metadata as Record<string, any>)
        : {};

    capture.metadata = {
      ...prev,
      leadScore: {
        ...(prev.leadScore && typeof prev.leadScore === 'object'
          ? (prev.leadScore as Record<string, any>)
          : {}),
        activeCampaign: activeCampaignResponse,
      },
    };

    await this.formResponseRepo.manager.getRepository(Capture).save(capture);
    return { updated: true };
  }
}
