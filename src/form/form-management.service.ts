import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { Form } from '../database/entities/form/form.entity';
import { FormVersion } from '../database/entities/form/form-version.entity';
import { Question } from '../database/entities/form/question.entity';
import { QuestionOption } from '../database/entities/form/question-option.entity';
import { FormVersionQuestion } from '../database/entities/form/form-version-question.entity';
import { FormResponse } from '../database/entities/form/form-response.entity';
import { Launch } from '../database/entities/marketing/launch.entity';
import { Season } from '../database/entities/marketing/season.entity';
import { Leadscore } from '../database/entities/leadscore/leadscore.entity';
import { LeadscoreOptionPoints } from '../database/entities/leadscore/leadscore-option-points.entity';
import { LeadscoreRangePoints } from '../database/entities/leadscore/leadscore-range-points.entity';
import { LeadscoreTier } from '../database/entities/leadscore/leadscore-tier.entity';
import { LeadscoreTierRule } from '../database/entities/leadscore/leadscore-tier-rule.entity';
import {
  AddFormVersionQuestionDto,
  CreateFormVersionDto,
  FormVersionQuestionResponseDto,
  FormVersionResponseDto,
  ReorderFormVersionQuestionsDto,
  UpdateFormVersionDto,
  UpdateFormVersionQuestionDto,
} from './dto/form-version-management.dto';
import {
  CreateQuestionDto,
  CreateQuestionOptionDto,
  QuestionOptionResponseDto,
  QuestionResponseDto,
  UpdateQuestionDto,
  UpdateQuestionOptionDto,
} from './dto/question-management.dto';
import {
  CreateLeadscoreDto,
  CreateLeadscoreTierDto,
  LeadscoreOptionPointResponseDto,
  LeadscoreRangePointResponseDto,
  LeadscoreResponseDto,
  LeadscoreTierResponseDto,
  LeadscoreTierRuleResponseDto,
  ReplaceLeadscoreOptionPointsDto,
  ReplaceLeadscoreRangePointsDto,
  ReplaceLeadscoreTierRulesDto,
  UpdateLeadscoreDto,
  UpdateLeadscoreTierDto,
} from './dto/score-management.dto';
import {
  CreateFullFormPayloadDto,
  CreateFullFormResponseDto,
} from './dto/create-full-form.dto';
import {
  CloneFormPayloadDto,
  CloneFormResponseDto,
} from './dto/clone-form.dto';
import { FormResponseDto } from './dto/form-response.dto';

@Injectable()
export class FormManagementService {
  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  constructor(
    @InjectRepository(Form)
    private readonly formRepo: Repository<Form>,
    @InjectRepository(FormVersion)
    private readonly formVersionRepo: Repository<FormVersion>,
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
    @InjectRepository(QuestionOption)
    private readonly questionOptionRepo: Repository<QuestionOption>,
    @InjectRepository(FormVersionQuestion)
    private readonly formVersionQuestionRepo: Repository<FormVersionQuestion>,
    @InjectRepository(Leadscore)
    private readonly leadscoreRepo: Repository<Leadscore>,
    @InjectRepository(LeadscoreOptionPoints)
    private readonly leadscoreOptionPointsRepo: Repository<LeadscoreOptionPoints>,
    @InjectRepository(LeadscoreRangePoints)
    private readonly leadscoreRangePointsRepo: Repository<LeadscoreRangePoints>,
    @InjectRepository(LeadscoreTier)
    private readonly leadscoreTierRepo: Repository<LeadscoreTier>,
    @InjectRepository(LeadscoreTierRule)
    private readonly leadscoreTierRuleRepo: Repository<LeadscoreTierRule>,
    @InjectRepository(Launch)
    private readonly launchRepo: Repository<Launch>,
    @InjectRepository(Season)
    private readonly seasonRepo: Repository<Season>,
  ) {}

  async listVersions(formId: string): Promise<FormVersionResponseDto[]> {
    await this.mustFindFormById(formId);

    const versions = await this.formVersionRepo.find({
      where: { form: { id: formId } },
      order: { version_number: 'DESC', created_at: 'DESC' },
      relations: ['form'],
    });

    return versions.map((row) => this.mapFormVersion(row));
  }

  async findVersionById(
    formVersionId: string,
  ): Promise<FormVersionResponseDto> {
    const version = await this.mustFindFormVersionById(formVersionId);
    return this.mapFormVersion(version);
  }

  async createVersion(
    formId: string,
    dto: CreateFormVersionDto,
  ): Promise<FormVersionResponseDto> {
    const form = await this.mustFindFormById(formId);
    const active = this.parseOptionalBoolean(dto.active, 'active') ?? true;
    const requestedVersionNumber = this.parseOptionalPositiveInteger(
      dto.version_number,
      'version_number',
    );

    const saved = await this.formVersionRepo.manager.transaction(
      async (manager) => {
        const versionRepo = manager.getRepository(FormVersion);

        const versionNumber =
          requestedVersionNumber ??
          (await this.nextFormVersionNumber(manager, formId));

        if (active) {
          await versionRepo.update({ form: { id: formId } }, { active: false });
        }

        return await versionRepo.save(
          versionRepo.create({
            form,
            version_number: versionNumber,
            active,
          }),
        );
      },
    );

    const version = await this.mustFindFormVersionById(saved.id);
    return this.mapFormVersion(version);
  }

  async updateVersion(
    formVersionId: string,
    dto: UpdateFormVersionDto,
  ): Promise<FormVersionResponseDto> {
    const version = await this.mustFindFormVersionById(formVersionId);

    if (dto.version_number === undefined && dto.active === undefined) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualizacao: version_number ou active.',
      );
    }

    if (dto.version_number !== undefined) {
      version.version_number = this.parsePositiveInteger(
        dto.version_number,
        'version_number',
      );
    }

    if (dto.active !== undefined) {
      version.active = this.parseOptionalBoolean(dto.active, 'active') ?? true;
    }

    const saved = await this.formVersionRepo.manager.transaction(
      async (manager) => {
        const versionRepo = manager.getRepository(FormVersion);
        if (version.active) {
          await versionRepo.update(
            { form: { id: version.form.id } },
            { active: false },
          );
        }
        return await versionRepo.save(version);
      },
    );

    return this.mapFormVersion(saved);
  }

  async activateVersion(
    formVersionId: string,
  ): Promise<FormVersionResponseDto> {
    const version = await this.mustFindFormVersionById(formVersionId);

    const saved = await this.formVersionRepo.manager.transaction(
      async (manager) => {
        const versionRepo = manager.getRepository(FormVersion);
        await versionRepo.update(
          { form: { id: version.form.id } },
          { active: false },
        );
        version.active = true;
        return await versionRepo.save(version);
      },
    );

    return this.mapFormVersion(saved);
  }

  async removeVersion(formVersionId: string): Promise<void> {
    const result = await this.formVersionRepo.delete({ id: formVersionId });
    if (!result.affected) {
      throw new NotFoundException(
        `FormVersion nao encontrada para id=${formVersionId}.`,
      );
    }
  }

  async listQuestions(formId: string): Promise<QuestionResponseDto[]> {
    await this.mustFindFormById(formId);

    const questions = await this.questionRepo.find({
      where: { form: { id: formId } },
      order: { created_at: 'ASC' },
      relations: ['form'],
    });
    return questions.map((row) => this.mapQuestion(row));
  }

  async findQuestionById(questionId: string): Promise<QuestionResponseDto> {
    const question = await this.mustFindQuestionById(questionId);
    return this.mapQuestion(question);
  }

  async createQuestion(
    formId: string,
    dto: CreateQuestionDto,
  ): Promise<QuestionResponseDto> {
    const form = await this.mustFindFormById(formId);
    const questionKey = this.parseRequiredText(
      dto.question_key,
      'question_key',
    );
    const questionText = this.parseOptionalText(dto.question_text);
    const inputType = this.parseOptionalText(dto.input_type);

    const saved = await this.questionRepo.save(
      this.questionRepo.create({
        form,
        question_key: questionKey,
        question_text: questionText,
        input_type: inputType,
      }),
    );

    const created = await this.mustFindQuestionById(saved.id);
    return this.mapQuestion(created);
  }

  async updateQuestion(
    questionId: string,
    dto: UpdateQuestionDto,
  ): Promise<QuestionResponseDto> {
    const question = await this.mustFindQuestionById(questionId);

    if (
      dto.question_key === undefined &&
      dto.question_text === undefined &&
      dto.input_type === undefined
    ) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualizacao: question_key, question_text ou input_type.',
      );
    }

    if (dto.question_key !== undefined) {
      question.question_key = this.parseRequiredText(
        dto.question_key,
        'question_key',
      );
    }

    if (dto.question_text !== undefined) {
      question.question_text = this.parseOptionalText(dto.question_text);
    }

    if (dto.input_type !== undefined) {
      question.input_type = this.parseOptionalText(dto.input_type);
    }

    const saved = await this.questionRepo.save(question);
    return this.mapQuestion(saved);
  }

  async removeQuestion(questionId: string): Promise<void> {
    const result = await this.questionRepo.delete({ id: questionId });
    if (!result.affected) {
      throw new NotFoundException(
        `Question nao encontrada para id=${questionId}.`,
      );
    }
  }

  async listQuestionOptions(
    questionId: string,
  ): Promise<QuestionOptionResponseDto[]> {
    await this.mustFindQuestionById(questionId);

    const options = await this.questionOptionRepo.find({
      where: { question: { id: questionId } },
      order: { display_order: 'ASC', created_at: 'ASC' },
      relations: ['question'],
    });
    return options.map((row) => this.mapQuestionOption(row));
  }

  async createQuestionOption(
    questionId: string,
    dto: CreateQuestionOptionDto,
  ): Promise<QuestionOptionResponseDto> {
    const question = await this.mustFindQuestionById(questionId);
    const optionKey = this.parseRequiredText(dto.option_key, 'option_key');
    const optionText = this.parseOptionalText(dto.option_text);
    const displayOrder =
      this.parseOptionalInteger(dto.display_order, 'display_order') ?? 0;

    const saved = await this.questionOptionRepo.save(
      this.questionOptionRepo.create({
        question,
        option_key: optionKey,
        option_text: optionText,
        display_order: displayOrder,
      }),
    );

    const created = await this.mustFindQuestionOptionById(saved.id);
    return this.mapQuestionOption(created);
  }

  async updateQuestionOption(
    optionId: string,
    dto: UpdateQuestionOptionDto,
  ): Promise<QuestionOptionResponseDto> {
    const option = await this.mustFindQuestionOptionById(optionId);

    if (
      dto.option_key === undefined &&
      dto.option_text === undefined &&
      dto.display_order === undefined
    ) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualizacao: option_key, option_text ou display_order.',
      );
    }

    if (dto.option_key !== undefined) {
      option.option_key = this.parseRequiredText(dto.option_key, 'option_key');
    }

    if (dto.option_text !== undefined) {
      option.option_text = this.parseOptionalText(dto.option_text);
    }

    if (dto.display_order !== undefined) {
      option.display_order = this.parseInteger(
        dto.display_order,
        'display_order',
      );
    }

    const saved = await this.questionOptionRepo.save(option);
    return this.mapQuestionOption(saved);
  }

  async removeQuestionOption(optionId: string): Promise<void> {
    const result = await this.questionOptionRepo.delete({ id: optionId });
    if (!result.affected) {
      throw new NotFoundException(
        `QuestionOption nao encontrada para id=${optionId}.`,
      );
    }
  }

  async listFormVersionQuestions(
    formVersionId: string,
  ): Promise<FormVersionQuestionResponseDto[]> {
    await this.mustFindFormVersionById(formVersionId);

    const rows = await this.formVersionQuestionRepo.find({
      where: { form_version: { id: formVersionId } },
      relations: ['question', 'form_version'],
      order: { display_order: 'ASC', created_at: 'ASC' },
    });

    return rows.map((row) => this.mapFormVersionQuestion(row));
  }

  async addFormVersionQuestion(
    formVersionId: string,
    dto: AddFormVersionQuestionDto,
  ): Promise<FormVersionQuestionResponseDto> {
    const formVersion = await this.mustFindFormVersionById(formVersionId);
    const questionId = this.parseRequiredUuid(dto.question_id, 'question_id');

    const question = await this.mustFindQuestionById(questionId);
    this.assertQuestionBelongsToForm(question, formVersion.form.id);

    const alreadyExists = await this.formVersionQuestionRepo.findOne({
      where: {
        form_version: { id: formVersionId },
        question: { id: questionId },
      },
    });
    if (alreadyExists) {
      throw new BadRequestException(
        `Question ${questionId} ja vinculada a form_version ${formVersionId}.`,
      );
    }

    const displayOrder =
      this.parseOptionalInteger(dto.display_order, 'display_order') ??
      (await this.nextFormVersionQuestionOrder(formVersionId));
    const required =
      this.parseOptionalBoolean(dto.required, 'required') ?? false;

    await this.formVersionQuestionRepo.save(
      this.formVersionQuestionRepo.create({
        form_version: formVersion,
        question,
        display_order: displayOrder,
        required,
      }),
    );

    const created = await this.mustFindFormVersionQuestion(
      formVersionId,
      questionId,
    );
    return this.mapFormVersionQuestion(created);
  }

  async updateFormVersionQuestion(
    formVersionId: string,
    questionId: string,
    dto: UpdateFormVersionQuestionDto,
  ): Promise<FormVersionQuestionResponseDto> {
    const relation = await this.mustFindFormVersionQuestion(
      formVersionId,
      questionId,
    );

    if (dto.display_order === undefined && dto.required === undefined) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualizacao: display_order ou required.',
      );
    }

    if (dto.display_order !== undefined) {
      relation.display_order = this.parseInteger(
        dto.display_order,
        'display_order',
      );
    }

    if (dto.required !== undefined) {
      relation.required =
        this.parseOptionalBoolean(dto.required, 'required') ?? false;
    }

    const saved = await this.formVersionQuestionRepo.save(relation);
    return this.mapFormVersionQuestion(saved);
  }

  async removeFormVersionQuestion(
    formVersionId: string,
    questionId: string,
  ): Promise<void> {
    const relation = await this.mustFindFormVersionQuestion(
      formVersionId,
      questionId,
    );
    await this.formVersionQuestionRepo.delete({ id: relation.id });
  }

  async reorderFormVersionQuestions(
    formVersionId: string,
    dto: ReorderFormVersionQuestionsDto,
  ): Promise<FormVersionQuestionResponseDto[]> {
    if (!Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('items deve ser uma lista nao vazia.');
    }

    const parsedItems = dto.items.map((item) => ({
      question_id: this.parseRequiredUuid(item.question_id, 'question_id'),
      display_order: this.parseInteger(item.display_order, 'display_order'),
      required:
        item.required === undefined
          ? undefined
          : (this.parseOptionalBoolean(item.required, 'required') ?? false),
    }));

    const questionIdSet = new Set(parsedItems.map((item) => item.question_id));
    if (questionIdSet.size !== parsedItems.length) {
      throw new BadRequestException(
        'Nao e permitido repetir question_id no payload de reorder.',
      );
    }

    const relations = await this.formVersionQuestionRepo.find({
      where: {
        form_version: { id: formVersionId },
        question: { id: In(parsedItems.map((item) => item.question_id)) },
      },
      relations: ['question', 'form_version'],
    });

    if (relations.length !== parsedItems.length) {
      throw new NotFoundException(
        'Uma ou mais perguntas nao estao vinculadas a esta form_version.',
      );
    }

    const relationByQuestionId = new Map(
      relations.map((relation) => [relation.question.id, relation]),
    );

    for (const item of parsedItems) {
      const relation = relationByQuestionId.get(item.question_id);
      if (!relation) continue;
      relation.display_order = item.display_order;
      if (item.required !== undefined) {
        relation.required = item.required;
      }
    }

    await this.formVersionQuestionRepo.save(relations);
    return relations
      .sort((a, b) => a.display_order - b.display_order)
      .map((row) => this.mapFormVersionQuestion(row));
  }

  async listScores(formVersionId: string): Promise<LeadscoreResponseDto[]> {
    await this.mustFindFormVersionById(formVersionId);

    const rows = await this.leadscoreRepo.find({
      where: { form_version: { id: formVersionId } },
      order: { created_at: 'DESC' },
      relations: ['form_version'],
    });
    return rows.map((row) => this.mapLeadscore(row));
  }

  async createScore(
    formVersionId: string,
    dto: CreateLeadscoreDto,
  ): Promise<LeadscoreResponseDto> {
    const formVersion = await this.mustFindFormVersionById(formVersionId);
    const name = this.parseRequiredText(dto.name, 'name');
    const active = this.parseOptionalBoolean(dto.active, 'active') ?? true;

    const saved = await this.leadscoreRepo.manager.transaction(
      async (manager) => {
        const leadscoreRepo = manager.getRepository(Leadscore);
        if (active) {
          await leadscoreRepo.update(
            { form_version: { id: formVersionId } },
            { active: false },
          );
        }

        return await leadscoreRepo.save(
          leadscoreRepo.create({
            form_version: formVersion,
            name,
            active,
          }),
        );
      },
    );

    return this.mapLeadscore(saved);
  }

  async updateScore(
    leadscoreId: string,
    dto: UpdateLeadscoreDto,
  ): Promise<LeadscoreResponseDto> {
    const leadscore = await this.mustFindLeadscoreById(leadscoreId);

    if (dto.name === undefined && dto.active === undefined) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualizacao: name ou active.',
      );
    }

    if (dto.name !== undefined) {
      leadscore.name = this.parseRequiredText(dto.name, 'name');
    }

    if (dto.active !== undefined) {
      leadscore.active =
        this.parseOptionalBoolean(dto.active, 'active') ?? false;
    }

    const saved = await this.leadscoreRepo.manager.transaction(
      async (manager) => {
        const leadscoreRepo = manager.getRepository(Leadscore);
        if (leadscore.active) {
          await leadscoreRepo.update(
            { form_version: { id: leadscore.form_version.id } },
            { active: false },
          );
        }
        return await leadscoreRepo.save(leadscore);
      },
    );

    return this.mapLeadscore(saved);
  }

  async activateScore(leadscoreId: string): Promise<LeadscoreResponseDto> {
    const leadscore = await this.mustFindLeadscoreById(leadscoreId);

    const saved = await this.leadscoreRepo.manager.transaction(
      async (manager) => {
        const leadscoreRepo = manager.getRepository(Leadscore);
        await leadscoreRepo.update(
          { form_version: { id: leadscore.form_version.id } },
          { active: false },
        );
        leadscore.active = true;
        return await leadscoreRepo.save(leadscore);
      },
    );

    return this.mapLeadscore(saved);
  }

  async removeScore(leadscoreId: string): Promise<void> {
    const result = await this.leadscoreRepo.delete({ id: leadscoreId });
    if (!result.affected) {
      throw new NotFoundException(
        `Leadscore nao encontrado para id=${leadscoreId}.`,
      );
    }
  }

  async listScoreOptionPoints(
    leadscoreId: string,
  ): Promise<LeadscoreOptionPointResponseDto[]> {
    await this.mustFindLeadscoreById(leadscoreId);

    const rows = await this.leadscoreOptionPointsRepo.find({
      where: { leadscore: { id: leadscoreId } },
      relations: ['leadscore', 'question', 'option'],
      order: {
        question: { question_key: 'ASC' },
        option: { display_order: 'ASC' },
      },
    });

    return rows.map((row) => ({
      leadscore_id: row.leadscore.id,
      question_id: row.question.id,
      option_id: row.option.id,
      question_key: row.question.question_key,
      option_key: row.option.option_key,
      points: Number(row.points),
    }));
  }

  async replaceScoreOptionPoints(
    leadscoreId: string,
    dto: ReplaceLeadscoreOptionPointsDto,
  ): Promise<LeadscoreOptionPointResponseDto[]> {
    const leadscore = await this.mustFindLeadscoreById(leadscoreId);
    const formId = leadscore.form_version.form.id;

    if (!Array.isArray(dto.items)) {
      throw new BadRequestException('items deve ser uma lista.');
    }

    const parsedItems = dto.items.map((item) => ({
      question_id: this.parseRequiredUuid(item.question_id, 'question_id'),
      option_id: this.parseRequiredUuid(item.option_id, 'option_id'),
      points: this.parseNumber(item.points, 'points'),
    }));

    const duplicateKeySet = new Set(
      parsedItems.map((item) => `${item.question_id}:${item.option_id}`),
    );
    if (duplicateKeySet.size !== parsedItems.length) {
      throw new BadRequestException(
        'Nao e permitido repetir pares question_id + option_id.',
      );
    }

    const questionIds = Array.from(
      new Set(parsedItems.map((item) => item.question_id)),
    );
    const optionIds = Array.from(
      new Set(parsedItems.map((item) => item.option_id)),
    );

    const questions = await this.questionRepo.find({
      where: { id: In(questionIds) },
      relations: ['form'],
    });
    const options = await this.questionOptionRepo.find({
      where: { id: In(optionIds) },
      relations: ['question'],
    });

    const questionById = new Map(questions.map((row) => [row.id, row]));
    const optionById = new Map(options.map((row) => [row.id, row]));

    for (const item of parsedItems) {
      const question = questionById.get(item.question_id);
      const option = optionById.get(item.option_id);
      if (!question) {
        throw new NotFoundException(
          `Question nao encontrada para id=${item.question_id}.`,
        );
      }
      if (!option) {
        throw new NotFoundException(
          `Option nao encontrada para id=${item.option_id}.`,
        );
      }
      if (question.form.id !== formId) {
        throw new BadRequestException(
          `Question ${item.question_id} nao pertence ao form da versao de score.`,
        );
      }
      if (option.question.id !== question.id) {
        throw new BadRequestException(
          `Option ${item.option_id} nao pertence a question ${item.question_id}.`,
        );
      }
    }

    await this.leadscoreOptionPointsRepo.manager.transaction(
      async (manager) => {
        const optionPointsRepo = manager.getRepository(LeadscoreOptionPoints);
        await optionPointsRepo.delete({ leadscore: { id: leadscoreId } });
        if (!parsedItems.length) return;

        const entities = parsedItems.map((item) =>
          optionPointsRepo.create({
            leadscore,
            question: questionById.get(item.question_id)!,
            option: optionById.get(item.option_id)!,
            points: item.points,
          }),
        );
        await optionPointsRepo.save(entities);
      },
    );

    return await this.listScoreOptionPoints(leadscoreId);
  }

  async listScoreRangePoints(
    leadscoreId: string,
  ): Promise<LeadscoreRangePointResponseDto[]> {
    await this.mustFindLeadscoreById(leadscoreId);

    const rows = await this.leadscoreRangePointsRepo.find({
      where: { leadscore: { id: leadscoreId } },
      relations: ['leadscore', 'question'],
      order: {
        question: { question_key: 'ASC' },
        created_at: 'ASC',
      },
    });

    return rows.map((row) => ({
      leadscore_id: row.leadscore.id,
      question_id: row.question.id,
      question_key: row.question.question_key,
      min_value: row.min_value ?? null,
      max_value: row.max_value ?? null,
      points: Number(row.points),
    }));
  }

  async replaceScoreRangePoints(
    leadscoreId: string,
    dto: ReplaceLeadscoreRangePointsDto,
  ): Promise<LeadscoreRangePointResponseDto[]> {
    const leadscore = await this.mustFindLeadscoreById(leadscoreId);
    const formId = leadscore.form_version.form.id;

    if (!Array.isArray(dto.items)) {
      throw new BadRequestException('items deve ser uma lista.');
    }

    const parsedItems = dto.items.map((item) => {
      const minValue = this.parseOptionalNumber(item.min_value, 'min_value');
      const maxValue = this.parseOptionalNumber(item.max_value, 'max_value');
      if (
        minValue !== undefined &&
        maxValue !== undefined &&
        minValue > maxValue
      ) {
        throw new BadRequestException(
          'min_value nao pode ser maior que max_value.',
        );
      }
      return {
        question_id: this.parseRequiredUuid(item.question_id, 'question_id'),
        min_value: minValue,
        max_value: maxValue,
        points: this.parseNumber(item.points, 'points'),
      };
    });

    const questionIds = Array.from(
      new Set(parsedItems.map((item) => item.question_id)),
    );
    const questions = await this.questionRepo.find({
      where: { id: In(questionIds) },
      relations: ['form'],
    });
    const questionById = new Map(questions.map((row) => [row.id, row]));

    for (const item of parsedItems) {
      const question = questionById.get(item.question_id);
      if (!question) {
        throw new NotFoundException(
          `Question nao encontrada para id=${item.question_id}.`,
        );
      }
      if (question.form.id !== formId) {
        throw new BadRequestException(
          `Question ${item.question_id} nao pertence ao form da versao de score.`,
        );
      }
    }

    await this.leadscoreRangePointsRepo.manager.transaction(async (manager) => {
      const rangeRepo = manager.getRepository(LeadscoreRangePoints);
      await rangeRepo.delete({ leadscore: { id: leadscoreId } });
      if (!parsedItems.length) return;

      const entities = parsedItems.map((item) =>
        rangeRepo.create({
          leadscore,
          question: questionById.get(item.question_id)!,
          min_value: item.min_value,
          max_value: item.max_value,
          points: item.points,
        }),
      );
      await rangeRepo.save(entities);
    });

    return await this.listScoreRangePoints(leadscoreId);
  }

  async listTiers(): Promise<LeadscoreTierResponseDto[]> {
    const tiers = await this.leadscoreTierRepo.find({ order: { code: 'ASC' } });
    return tiers.map((tier) => this.mapLeadscoreTier(tier));
  }

  async createTier(
    dto: CreateLeadscoreTierDto,
  ): Promise<LeadscoreTierResponseDto> {
    const code = dto.code?.trim();
    const name = dto.name?.trim();
    if (!code) throw new BadRequestException('code e obrigatorio.');
    if (!name) throw new BadRequestException('name e obrigatorio.');

    const existing = await this.leadscoreTierRepo.findOne({ where: { code } });
    if (existing) {
      throw new BadRequestException(`Ja existe uma faixa com code="${code}".`);
    }

    const tier = await this.leadscoreTierRepo.save(
      this.leadscoreTierRepo.create({ code, name }),
    );
    return this.mapLeadscoreTier(tier);
  }

  async updateTier(
    id: string,
    dto: UpdateLeadscoreTierDto,
  ): Promise<LeadscoreTierResponseDto> {
    const tier = await this.leadscoreTierRepo.findOne({ where: { id } });
    if (!tier) {
      throw new NotFoundException(
        `LeadscoreTier nao encontrado para id=${id}.`,
      );
    }

    if (dto.code !== undefined) {
      const code = dto.code.trim();
      if (!code) throw new BadRequestException('code nao pode ser vazio.');
      const existing = await this.leadscoreTierRepo.findOne({
        where: { code },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException(
          `Ja existe uma faixa com code="${code}".`,
        );
      }
      tier.code = code;
    }
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('name nao pode ser vazio.');
      tier.name = name;
    }

    const saved = await this.leadscoreTierRepo.save(tier);
    return this.mapLeadscoreTier(saved);
  }

  async listScoreTierRules(
    leadscoreId: string,
  ): Promise<LeadscoreTierRuleResponseDto[]> {
    await this.mustFindLeadscoreById(leadscoreId);

    const rows = await this.leadscoreTierRuleRepo.find({
      where: { leadscore: { id: leadscoreId } },
      relations: ['leadscore', 'tier'],
      order: {
        min_score: 'DESC',
        created_at: 'ASC',
      },
    });

    return rows.map((row) => this.mapLeadscoreTierRule(row));
  }

  async replaceScoreTierRules(
    leadscoreId: string,
    dto: ReplaceLeadscoreTierRulesDto,
  ): Promise<LeadscoreTierRuleResponseDto[]> {
    const leadscore = await this.mustFindLeadscoreById(leadscoreId);

    if (!Array.isArray(dto.items)) {
      throw new BadRequestException('items deve ser uma lista.');
    }

    const parsedItems = dto.items.map((item) => {
      const minScore = this.parseOptionalNumber(item.min_score, 'min_score');
      const maxScore = this.parseOptionalNumber(item.max_score, 'max_score');
      if (
        minScore !== undefined &&
        maxScore !== undefined &&
        minScore >= maxScore
      ) {
        throw new BadRequestException(
          'min_score deve ser menor que max_score.',
        );
      }
      return {
        tier_id: this.parseRequiredUuid(item.tier_id, 'tier_id'),
        min_score: minScore,
        max_score: maxScore,
      };
    });

    const duplicateTierSet = new Set(parsedItems.map((item) => item.tier_id));
    if (duplicateTierSet.size !== parsedItems.length) {
      throw new BadRequestException('Nao e permitido repetir tier_id.');
    }

    const tierIds = Array.from(
      new Set(parsedItems.map((item) => item.tier_id)),
    );
    const tiers = tierIds.length
      ? await this.leadscoreTierRepo.find({ where: { id: In(tierIds) } })
      : [];
    const tierById = new Map(tiers.map((row) => [row.id, row]));

    for (const item of parsedItems) {
      if (!tierById.has(item.tier_id)) {
        throw new NotFoundException(
          `LeadscoreTier nao encontrado para id=${item.tier_id}.`,
        );
      }
    }

    await this.leadscoreTierRuleRepo.manager.transaction(async (manager) => {
      const tierRuleRepo = manager.getRepository(LeadscoreTierRule);
      await tierRuleRepo.delete({ leadscore: { id: leadscoreId } });
      if (!parsedItems.length) return;

      const entities = parsedItems.map((item) =>
        tierRuleRepo.create({
          leadscore,
          tier: tierById.get(item.tier_id)!,
          min_score: item.min_score,
          max_score: item.max_score,
        }),
      );
      await tierRuleRepo.save(entities);
    });

    return await this.listScoreTierRules(leadscoreId);
  }

  async clone(payload: CloneFormPayloadDto): Promise<CloneFormResponseDto> {
    const sourceFormId = this.parseRequiredUuid(
      payload.source_form_id,
      'source_form_id',
    );
    const sourceFormVersionId = this.parseRequiredUuid(
      payload.source_form_version_id,
      'source_form_version_id',
    );
    const targetFormId = this.parseRequiredUuid(
      payload.target_form_id,
      'target_form_id',
    );
    const requestedTargetFormVersionId = this.parseRequiredUuid(
      payload.target_form_version_id,
      'target_form_version_id',
    );

    return await this.formRepo.manager.transaction(async (manager) => {
      const formRepo = manager.getRepository(Form);
      const formVersionRepo = manager.getRepository(FormVersion);
      const questionRepo = manager.getRepository(Question);
      const questionOptionRepo = manager.getRepository(QuestionOption);
      const formVersionQuestionRepo =
        manager.getRepository(FormVersionQuestion);
      const formResponseRepo = manager.getRepository(FormResponse);
      const leadscoreRepo = manager.getRepository(Leadscore);
      const leadscoreOptionPointsRepo = manager.getRepository(
        LeadscoreOptionPoints,
      );
      const leadscoreRangePointsRepo =
        manager.getRepository(LeadscoreRangePoints);
      const leadscoreTierRuleRepo = manager.getRepository(LeadscoreTierRule);

      const sourceForm = await formRepo.findOne({
        where: { id: sourceFormId },
        relations: ['launch', 'season'],
      });
      if (!sourceForm) {
        throw new NotFoundException(
          `Form origem nao encontrado para id=${sourceFormId}.`,
        );
      }

      const targetForm = await formRepo.findOne({
        where: { id: targetFormId },
        relations: ['launch', 'season'],
      });
      if (!targetForm) {
        throw new NotFoundException(
          `Form destino nao encontrado para id=${targetFormId}.`,
        );
      }

      const sourceVersion = await formVersionRepo.findOne({
        where: { id: sourceFormVersionId },
        relations: ['form'],
      });
      if (!sourceVersion) {
        throw new NotFoundException(
          `FormVersion origem nao encontrada para id=${sourceFormVersionId}.`,
        );
      }
      if (sourceVersion.form.id !== sourceFormId) {
        throw new BadRequestException(
          `source_form_version_id ${sourceFormVersionId} nao pertence ao source_form_id ${sourceFormId}.`,
        );
      }

      const requestedTargetVersion = await formVersionRepo.findOne({
        where: { id: requestedTargetFormVersionId },
        relations: ['form'],
      });
      if (!requestedTargetVersion) {
        throw new NotFoundException(
          `FormVersion destino nao encontrada para id=${requestedTargetFormVersionId}.`,
        );
      }
      if (requestedTargetVersion.form.id !== targetFormId) {
        throw new BadRequestException(
          `target_form_version_id ${requestedTargetFormVersionId} nao pertence ao target_form_id ${targetFormId}.`,
        );
      }

      const targetQuestionLinksCount = await formVersionQuestionRepo.count({
        where: { form_version: { id: requestedTargetFormVersionId } },
      });
      const targetScoresCount = await leadscoreRepo.count({
        where: { form_version: { id: requestedTargetFormVersionId } },
      });
      const targetResponsesCount = await formResponseRepo.count({
        where: { form_version: { id: requestedTargetFormVersionId } },
      });
      const createdNewVersion =
        targetQuestionLinksCount > 0 ||
        targetScoresCount > 0 ||
        targetResponsesCount > 0;

      let targetVersion = requestedTargetVersion;
      if (createdNewVersion) {
        if (requestedTargetVersion.active) {
          await formVersionRepo.update(
            { form: { id: targetFormId } },
            { active: false },
          );
        }

        targetVersion = await formVersionRepo.save(
          formVersionRepo.create({
            form: targetForm,
            version_number: await this.nextFormVersionNumber(
              manager,
              targetFormId,
            ),
            active: requestedTargetVersion.active,
          }),
        );
      }

      const sourceQuestionLinks = await formVersionQuestionRepo.find({
        where: { form_version: { id: sourceFormVersionId } },
        relations: ['question', 'question.form', 'form_version'],
        order: { display_order: 'ASC', created_at: 'ASC' },
      });
      const sourceScores = await leadscoreRepo.find({
        where: { form_version: { id: sourceFormVersionId } },
        relations: ['form_version'],
        order: { created_at: 'ASC' },
      });
      const sourceScoreIds = sourceScores.map((score) => score.id);

      const sourceOptionPoints = sourceScoreIds.length
        ? await leadscoreOptionPointsRepo.find({
            where: { leadscore: { id: In(sourceScoreIds) } },
            relations: ['leadscore', 'question', 'option'],
            order: { created_at: 'ASC' },
          })
        : [];
      const sourceRangePoints = sourceScoreIds.length
        ? await leadscoreRangePointsRepo.find({
            where: { leadscore: { id: In(sourceScoreIds) } },
            relations: ['leadscore', 'question'],
            order: { created_at: 'ASC' },
          })
        : [];
      const sourceTierRules = sourceScoreIds.length
        ? await leadscoreTierRuleRepo.find({
            where: { leadscore: { id: In(sourceScoreIds) } },
            relations: ['leadscore', 'tier'],
            order: { created_at: 'ASC' },
          })
        : [];

      const sourceQuestionIdSet = new Set<string>();
      for (const link of sourceQuestionLinks) {
        sourceQuestionIdSet.add(link.question.id);
      }
      for (const point of sourceOptionPoints) {
        sourceQuestionIdSet.add(point.question.id);
      }
      for (const point of sourceRangePoints) {
        sourceQuestionIdSet.add(point.question.id);
      }

      const sourceQuestionIds = Array.from(sourceQuestionIdSet);
      const sourceQuestions = sourceQuestionIds.length
        ? await questionRepo.find({
            where: { id: In(sourceQuestionIds) },
            relations: ['form'],
          })
        : [];
      const sourceQuestionById = new Map(
        sourceQuestions.map((question) => [question.id, question]),
      );

      for (const questionId of sourceQuestionIds) {
        const question = sourceQuestionById.get(questionId);
        if (!question) {
          throw new NotFoundException(
            `Question origem nao encontrada para id=${questionId}.`,
          );
        }
        if (question.form.id !== sourceForm.id) {
          throw new BadRequestException(
            `Question origem ${questionId} nao pertence ao source_form_id ${sourceForm.id}.`,
          );
        }
      }

      const questionBySourceId = new Map<string, Question>();
      for (const sourceQuestionId of sourceQuestionIds) {
        const sourceQuestion = sourceQuestionById.get(sourceQuestionId)!;
        const targetQuestion = await questionRepo.save(
          questionRepo.create({
            form: targetForm,
            question_key: sourceQuestion.question_key,
            question_text: sourceQuestion.question_text,
            input_type: sourceQuestion.input_type,
          }),
        );
        questionBySourceId.set(sourceQuestion.id, targetQuestion);
      }

      const sourceOptions = sourceQuestionIds.length
        ? await questionOptionRepo.find({
            where: { question: { id: In(sourceQuestionIds) } },
            relations: ['question'],
          })
        : [];
      sourceOptions.sort((a, b) => {
        if (a.question.id !== b.question.id) {
          return a.question.id.localeCompare(b.question.id);
        }
        if (a.display_order !== b.display_order) {
          return a.display_order - b.display_order;
        }
        return a.created_at.getTime() - b.created_at.getTime();
      });

      const optionBySourceId = new Map<string, QuestionOption>();
      for (const sourceOption of sourceOptions) {
        const targetQuestion = questionBySourceId.get(sourceOption.question.id);
        if (!targetQuestion) continue;

        const targetOption = await questionOptionRepo.save(
          questionOptionRepo.create({
            question: targetQuestion,
            option_key: sourceOption.option_key,
            option_text: sourceOption.option_text,
            display_order: sourceOption.display_order,
          }),
        );
        optionBySourceId.set(sourceOption.id, targetOption);
      }

      const targetQuestionLinks = sourceQuestionLinks.map((link) => {
        const targetQuestion = questionBySourceId.get(link.question.id);
        if (!targetQuestion) {
          throw new BadRequestException(
            `Nao foi possivel clonar a question ${link.question.id}.`,
          );
        }

        return formVersionQuestionRepo.create({
          form_version: targetVersion,
          question: targetQuestion,
          display_order: link.display_order,
          required: link.required,
        });
      });
      if (targetQuestionLinks.length) {
        await formVersionQuestionRepo.save(targetQuestionLinks);
      }

      const scoreBySourceId = new Map<string, Leadscore>();
      for (const sourceScore of sourceScores) {
        const targetScore = await leadscoreRepo.save(
          leadscoreRepo.create({
            form_version: targetVersion,
            name: sourceScore.name,
            active: sourceScore.active,
          }),
        );
        scoreBySourceId.set(sourceScore.id, targetScore);
      }

      const targetOptionPoints = sourceOptionPoints.map((point) => {
        const targetScore = scoreBySourceId.get(point.leadscore.id);
        const targetQuestion = questionBySourceId.get(point.question.id);
        const targetOption = optionBySourceId.get(point.option.id);

        if (!targetScore || !targetQuestion || !targetOption) {
          throw new BadRequestException(
            `Nao foi possivel clonar pontos por opcao para leadscore=${point.leadscore.id}, question=${point.question.id}, option=${point.option.id}.`,
          );
        }

        return leadscoreOptionPointsRepo.create({
          leadscore: targetScore,
          question: targetQuestion,
          option: targetOption,
          points: point.points,
        });
      });
      if (targetOptionPoints.length) {
        await leadscoreOptionPointsRepo.save(targetOptionPoints);
      }

      const targetRangePoints = sourceRangePoints.map((point) => {
        const targetScore = scoreBySourceId.get(point.leadscore.id);
        const targetQuestion = questionBySourceId.get(point.question.id);

        if (!targetScore || !targetQuestion) {
          throw new BadRequestException(
            `Nao foi possivel clonar pontos por faixa para leadscore=${point.leadscore.id}, question=${point.question.id}.`,
          );
        }

        return leadscoreRangePointsRepo.create({
          leadscore: targetScore,
          question: targetQuestion,
          min_value: point.min_value,
          max_value: point.max_value,
          points: point.points,
        });
      });
      if (targetRangePoints.length) {
        await leadscoreRangePointsRepo.save(targetRangePoints);
      }

      const targetTierRules = sourceTierRules.map((rule) => {
        const targetScore = scoreBySourceId.get(rule.leadscore.id);
        if (!targetScore) {
          throw new BadRequestException(
            `Nao foi possivel clonar regra de tier para leadscore=${rule.leadscore.id}.`,
          );
        }

        return leadscoreTierRuleRepo.create({
          leadscore: targetScore,
          tier: rule.tier,
          min_score: rule.min_score,
          max_score: rule.max_score,
        });
      });
      if (targetTierRules.length) {
        await leadscoreTierRuleRepo.save(targetTierRules);
      }

      return {
        source_form_id: sourceFormId,
        source_form_version_id: sourceFormVersionId,
        target_form_id: targetFormId,
        requested_target_form_version_id: requestedTargetFormVersionId,
        target_form_version_id: targetVersion.id,
        created_new_version: createdNewVersion,
        target_version: this.mapFormVersion(targetVersion),
        questions_count: sourceQuestionIds.length,
        question_links_count: targetQuestionLinks.length,
        options_count: optionBySourceId.size,
        scores_count: scoreBySourceId.size,
        option_points_count: targetOptionPoints.length,
        range_points_count: targetRangePoints.length,
        tier_rules_count: targetTierRules.length,
      };
    });
  }

  async createFull(
    payload: CreateFullFormPayloadDto,
  ): Promise<CreateFullFormResponseDto> {
    const name = this.parseRequiredText(payload.name, 'name');
    const type = this.parseOptionalText(payload.type);
    const launchId = this.parseOptionalUuid(payload.launch_id, 'launch_id');
    const seasonId = this.parseOptionalUuid(payload.season_id, 'season_id');
    const requestedVersionNumber = this.parseOptionalPositiveInteger(
      payload.version_number,
      'version_number',
    );
    const versionActive =
      this.parseOptionalBoolean(payload.version_active, 'version_active') ??
      true;

    if (!Array.isArray(payload.questions) || payload.questions.length === 0) {
      throw new BadRequestException(
        'questions deve ser uma lista nao vazia para criacao completa.',
      );
    }

    const questionKeySet = new Set<string>();
    for (const question of payload.questions) {
      const questionKey = this.parseRequiredText(
        question.question_key,
        'question_key',
      );
      if (questionKeySet.has(questionKey)) {
        throw new BadRequestException(
          `question_key duplicado no payload: ${questionKey}.`,
        );
      }
      questionKeySet.add(questionKey);
      if (!Array.isArray(question.options) || question.options.length === 0) {
        throw new BadRequestException(
          `question ${questionKey} precisa conter ao menos uma option.`,
        );
      }
    }

    if (payload.scores) {
      const activeScores = payload.scores.filter(
        (score) => this.parseOptionalBoolean(score.active, 'active') ?? true,
      );
      if (activeScores.length > 1) {
        throw new BadRequestException(
          'No payload de scores e permitido apenas um score ativo.',
        );
      }
    }

    return await this.formRepo.manager.transaction(async (manager) => {
      const formRepo = manager.getRepository(Form);
      const formVersionRepo = manager.getRepository(FormVersion);
      const questionRepo = manager.getRepository(Question);
      const questionOptionRepo = manager.getRepository(QuestionOption);
      const formVersionQuestionRepo =
        manager.getRepository(FormVersionQuestion);
      const leadscoreRepo = manager.getRepository(Leadscore);
      const leadscoreOptionPointsRepo = manager.getRepository(
        LeadscoreOptionPoints,
      );
      const leadscoreRangePointsRepo =
        manager.getRepository(LeadscoreRangePoints);

      const launch = launchId
        ? await this.mustFindLaunchById(launchId, manager)
        : undefined;
      const season = seasonId
        ? await this.mustFindSeasonById(seasonId, manager)
        : undefined;
      this.assertLaunchSeasonConsistency(launch, season);

      const form = await formRepo.save(
        formRepo.create({
          name,
          type,
          launch,
          season,
        }),
      );

      const versionNumber =
        requestedVersionNumber ??
        (await this.nextFormVersionNumber(manager, form.id));

      const version = await formVersionRepo.save(
        formVersionRepo.create({
          form,
          version_number: versionNumber,
          active: versionActive,
        }),
      );

      const questionByKey = new Map<string, Question>();
      const optionByQuestionKeyAndOptionKey = new Map<string, QuestionOption>();
      let optionsCount = 0;

      for (let idx = 0; idx < payload.questions.length; idx++) {
        const item = payload.questions[idx];
        const questionKey = this.parseRequiredText(
          item.question_key,
          'question_key',
        );
        const questionText = this.parseOptionalText(item.question_text);
        const inputType = this.parseOptionalText(item.input_type);

        const question = await questionRepo.save(
          questionRepo.create({
            form,
            question_key: questionKey,
            question_text: questionText,
            input_type: inputType,
          }),
        );

        questionByKey.set(questionKey, question);

        const optionKeys = new Set<string>();
        for (let optionIdx = 0; optionIdx < item.options.length; optionIdx++) {
          const optionPayload = item.options[optionIdx];
          const optionKey = this.parseRequiredText(
            optionPayload.option_key,
            'option_key',
          );
          if (optionKeys.has(optionKey)) {
            throw new BadRequestException(
              `option_key duplicado na pergunta ${questionKey}: ${optionKey}.`,
            );
          }
          optionKeys.add(optionKey);

          const option = await questionOptionRepo.save(
            questionOptionRepo.create({
              question,
              option_key: optionKey,
              option_text: this.parseOptionalText(optionPayload.option_text),
              display_order:
                this.parseOptionalInteger(
                  optionPayload.display_order,
                  'display_order',
                ) ?? optionIdx + 1,
            }),
          );

          optionByQuestionKeyAndOptionKey.set(
            `${questionKey}::${optionKey}`,
            option,
          );
          optionsCount++;
        }

        await formVersionQuestionRepo.save(
          formVersionQuestionRepo.create({
            form_version: version,
            question,
            display_order:
              this.parseOptionalInteger(item.display_order, 'display_order') ??
              idx + 1,
            required:
              this.parseOptionalBoolean(item.required, 'required') ?? false,
          }),
        );
      }

      const createdScores: Leadscore[] = [];
      if (payload.scores?.length) {
        for (const scorePayload of payload.scores) {
          const score = await leadscoreRepo.save(
            leadscoreRepo.create({
              form_version: version,
              name: this.parseRequiredText(scorePayload.name, 'name'),
              active:
                this.parseOptionalBoolean(scorePayload.active, 'active') ??
                true,
            }),
          );
          createdScores.push(score);

          if (scorePayload.option_points?.length) {
            const optionPointEntities = scorePayload.option_points.map(
              (item) => {
                const questionKey = this.parseRequiredText(
                  item.question_key,
                  'question_key',
                );
                const optionKey = this.parseRequiredText(
                  item.option_key,
                  'option_key',
                );
                const question = questionByKey.get(questionKey);
                const option = optionByQuestionKeyAndOptionKey.get(
                  `${questionKey}::${optionKey}`,
                );

                if (!question || !option) {
                  throw new BadRequestException(
                    `Nao foi encontrada combinacao question_key=${questionKey} + option_key=${optionKey} para score.`,
                  );
                }

                return leadscoreOptionPointsRepo.create({
                  leadscore: score,
                  question,
                  option,
                  points: this.parseNumber(item.points, 'points'),
                });
              },
            );
            await leadscoreOptionPointsRepo.save(optionPointEntities);
          }

          if (scorePayload.range_points?.length) {
            const rangePointEntities = scorePayload.range_points.map((item) => {
              const questionKey = this.parseRequiredText(
                item.question_key,
                'question_key',
              );
              const question = questionByKey.get(questionKey);
              if (!question) {
                throw new BadRequestException(
                  `Nao foi encontrada question_key=${questionKey} para range_points.`,
                );
              }

              const minValue = this.parseOptionalNumber(
                item.min_value,
                'min_value',
              );
              const maxValue = this.parseOptionalNumber(
                item.max_value,
                'max_value',
              );
              if (
                minValue !== undefined &&
                maxValue !== undefined &&
                minValue > maxValue
              ) {
                throw new BadRequestException(
                  'min_value nao pode ser maior que max_value.',
                );
              }

              return leadscoreRangePointsRepo.create({
                leadscore: score,
                question,
                min_value: minValue,
                max_value: maxValue,
                points: this.parseNumber(item.points, 'points'),
              });
            });
            await leadscoreRangePointsRepo.save(rangePointEntities);
          }
        }
      }

      return {
        form: this.mapForm(form),
        version: this.mapFormVersion(version),
        questions_count: payload.questions.length,
        options_count: optionsCount,
        scores: createdScores.map((score) => this.mapLeadscore(score)),
      };
    });
  }

  private async mustFindFormById(formId: string): Promise<Form> {
    const form = await this.formRepo.findOne({
      where: { id: formId },
      relations: ['launch', 'season'],
    });
    if (!form) {
      throw new NotFoundException(`Form nao encontrado para id=${formId}.`);
    }
    return form;
  }

  private async mustFindFormVersionById(
    formVersionId: string,
  ): Promise<FormVersion> {
    const version = await this.formVersionRepo.findOne({
      where: { id: formVersionId },
      relations: ['form'],
    });
    if (!version) {
      throw new NotFoundException(
        `FormVersion nao encontrada para id=${formVersionId}.`,
      );
    }
    return version;
  }

  private async mustFindQuestionById(questionId: string): Promise<Question> {
    const question = await this.questionRepo.findOne({
      where: { id: questionId },
      relations: ['form'],
    });
    if (!question) {
      throw new NotFoundException(
        `Question nao encontrada para id=${questionId}.`,
      );
    }
    return question;
  }

  private async mustFindQuestionOptionById(
    optionId: string,
  ): Promise<QuestionOption> {
    const option = await this.questionOptionRepo.findOne({
      where: { id: optionId },
      relations: ['question'],
    });
    if (!option) {
      throw new NotFoundException(
        `QuestionOption nao encontrada para id=${optionId}.`,
      );
    }
    return option;
  }

  private async mustFindFormVersionQuestion(
    formVersionId: string,
    questionId: string,
  ): Promise<FormVersionQuestion> {
    const relation = await this.formVersionQuestionRepo.findOne({
      where: {
        form_version: { id: formVersionId },
        question: { id: questionId },
      },
      relations: ['question', 'form_version'],
    });
    if (!relation) {
      throw new NotFoundException(
        `Vinculo question=${questionId} nao encontrado para form_version=${formVersionId}.`,
      );
    }
    return relation;
  }

  private async mustFindLeadscoreById(leadscoreId: string): Promise<Leadscore> {
    const leadscore = await this.leadscoreRepo.findOne({
      where: { id: leadscoreId },
      relations: ['form_version', 'form_version.form'],
    });
    if (!leadscore) {
      throw new NotFoundException(
        `Leadscore nao encontrado para id=${leadscoreId}.`,
      );
    }
    return leadscore;
  }

  private async mustFindLaunchById(
    launchId: string,
    manager?: EntityManager,
  ): Promise<Launch> {
    const repo = manager ? manager.getRepository(Launch) : this.launchRepo;
    const launch = await repo.findOne({ where: { id: launchId } });
    if (!launch) {
      throw new NotFoundException(`Launch nao encontrado para id=${launchId}.`);
    }
    return launch;
  }

  private async mustFindSeasonById(
    seasonId: string,
    manager?: EntityManager,
  ): Promise<Season> {
    const repo = manager ? manager.getRepository(Season) : this.seasonRepo;
    const season = await repo.findOne({
      where: { id: seasonId },
      relations: ['launch'],
    });
    if (!season) {
      throw new NotFoundException(`Season nao encontrada para id=${seasonId}.`);
    }
    return season;
  }

  private parseRequiredText(value: unknown, fieldName: string): string {
    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} deve ser string.`);
    }
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(`${fieldName} e obrigatorio.`);
    }
    return normalized;
  }

  private parseOptionalText(value: unknown): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') {
      throw new BadRequestException('Valor invalido: esperado texto.');
    }
    const normalized = value.trim();
    return normalized || undefined;
  }

  private parseOptionalBoolean(
    value: unknown,
    fieldName: string,
  ): boolean | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1') return true;
      if (normalized === 'false' || normalized === '0') return false;
    }
    throw new BadRequestException(
      `${fieldName} invalido. Use boolean true/false (ou 1/0).`,
    );
  }

  private parseOptionalInteger(
    value: unknown,
    fieldName: string,
  ): number | undefined {
    if (value === undefined || value === null) return undefined;
    return this.parseInteger(value, fieldName);
  }

  private parseInteger(value: unknown, fieldName: string): number {
    const num =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number(value)
          : Number.NaN;
    if (!Number.isInteger(num)) {
      throw new BadRequestException(`${fieldName} deve ser inteiro.`);
    }
    return num;
  }

  private parsePositiveInteger(value: unknown, fieldName: string): number {
    const num = this.parseInteger(value, fieldName);
    if (num <= 0) {
      throw new BadRequestException(`${fieldName} deve ser maior que zero.`);
    }
    return num;
  }

  private parseOptionalPositiveInteger(
    value: unknown,
    fieldName: string,
  ): number | undefined {
    if (value === undefined || value === null) return undefined;
    return this.parsePositiveInteger(value, fieldName);
  }

  private parseNumber(value: unknown, fieldName: string): number {
    const num =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number(value)
          : Number.NaN;
    if (!Number.isFinite(num)) {
      throw new BadRequestException(`${fieldName} deve ser numerico.`);
    }
    return num;
  }

  private parseOptionalNumber(
    value: unknown,
    fieldName: string,
  ): number | undefined {
    if (value === undefined || value === null) return undefined;
    return this.parseNumber(value, fieldName);
  }

  private parseRequiredUuid(value: unknown, fieldName: string): string {
    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} deve ser string.`);
    }
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(`${fieldName} e obrigatorio.`);
    }
    if (!FormManagementService.UUID_REGEX.test(normalized)) {
      throw new BadRequestException(`${fieldName} deve ser um UUID valido.`);
    }
    return normalized;
  }

  private parseOptionalUuid(
    value: unknown,
    fieldName: string,
  ): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} deve ser string.`);
    }
    const normalized = value.trim();
    if (!normalized) return undefined;
    if (!FormManagementService.UUID_REGEX.test(normalized)) {
      throw new BadRequestException(`${fieldName} deve ser um UUID valido.`);
    }
    return normalized;
  }

  private assertQuestionBelongsToForm(
    question: Question,
    formId: string,
  ): void {
    if (question.form.id !== formId) {
      throw new BadRequestException(
        `Question ${question.id} nao pertence ao form ${formId}.`,
      );
    }
  }

  private assertLaunchSeasonConsistency(
    launch?: Launch | null,
    season?: Season | null,
  ): void {
    if (!launch || !season || !season.launch) return;
    if (season.launch.id !== launch.id) {
      throw new BadRequestException(
        'season_id informado nao pertence ao launch_id informado.',
      );
    }
  }

  private async nextFormVersionNumber(
    manager: EntityManager,
    formId: string,
  ): Promise<number> {
    const repo = manager.getRepository(FormVersion);
    const latest = await repo.findOne({
      where: { form: { id: formId } },
      order: { version_number: 'DESC' },
    });
    return latest ? latest.version_number + 1 : 1;
  }

  private async nextFormVersionQuestionOrder(
    formVersionId: string,
  ): Promise<number> {
    const latest = await this.formVersionQuestionRepo.findOne({
      where: { form_version: { id: formVersionId } },
      order: { display_order: 'DESC' },
    });
    return latest ? latest.display_order + 1 : 1;
  }

  private mapForm(form: Form): FormResponseDto {
    return {
      id: form.id,
      name: form.name,
      type: form.type ?? null,
      launch_id: form.launch?.id ?? null,
      season_id: form.season?.id ?? null,
      created_at: form.created_at.toISOString(),
      updated_at: form.updated_at.toISOString(),
    };
  }

  private mapFormVersion(row: FormVersion): FormVersionResponseDto {
    return {
      id: row.id,
      form_id: row.form.id,
      version_number: row.version_number,
      active: row.active,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  }

  private mapQuestion(row: Question): QuestionResponseDto {
    return {
      id: row.id,
      form_id: row.form.id,
      question_key: row.question_key,
      question_text: row.question_text,
      input_type: row.input_type,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  }

  private mapQuestionOption(row: QuestionOption): QuestionOptionResponseDto {
    return {
      id: row.id,
      question_id: row.question.id,
      option_key: row.option_key,
      option_text: row.option_text,
      display_order: row.display_order,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  }

  private mapFormVersionQuestion(
    row: FormVersionQuestion,
  ): FormVersionQuestionResponseDto {
    return {
      form_version_id: row.form_version.id,
      question_id: row.question.id,
      display_order: row.display_order,
      required: row.required,
      question_key: row.question.question_key,
      question_text: row.question.question_text,
      input_type: row.question.input_type,
    };
  }

  private mapLeadscore(row: Leadscore): LeadscoreResponseDto {
    return {
      id: row.id,
      form_version_id: row.form_version.id,
      name: row.name,
      active: row.active,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  }

  private mapLeadscoreTier(row: LeadscoreTier): LeadscoreTierResponseDto {
    return { id: row.id, code: row.code, name: row.name };
  }

  private mapLeadscoreTierRule(
    row: LeadscoreTierRule,
  ): LeadscoreTierRuleResponseDto {
    return {
      id: row.id,
      leadscore_id: row.leadscore.id,
      tier_id: row.tier.id,
      tier_code: row.tier.code,
      tier_name: row.tier.name,
      min_score: row.min_score ?? null,
      max_score: row.max_score ?? null,
    };
  }
}
