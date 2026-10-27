import { ValidationPipe } from '@nestjs/common';
import {
  AddFormVersionQuestionDto,
  ReorderFormVersionQuestionsDto,
} from './form-version-management.dto';
import {
  CreateQuestionDto,
  CreateQuestionOptionDto,
  UpdateQuestionOptionDto,
} from './question-management.dto';
import {
  CreateLeadscoreDto,
  CreateLeadscoreTierDto,
  ReplaceLeadscoreOptionPointsDto,
  ReplaceLeadscoreRangePointsDto,
  ReplaceLeadscoreTierRulesDto,
  UpdateLeadscoreDto,
  UpdateLeadscoreTierDto,
} from './score-management.dto';

const questionId = 'c8a029aa-e5b7-4687-951c-d8defc67c27c';
const optionId = '81fb42e8-f942-4864-bc00-6e2e3beb9908';
const tierIds = [questionId, optionId, '7405904f-64b9-4b2e-a067-a5fa246e1d55'];

describe('Form management request validation', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const transform = (metatype: new () => object, body: object) =>
    pipe.transform(body, { type: 'body', metatype });

  it.each([CreateQuestionOptionDto, UpdateQuestionOptionDto])(
    'accepts option fields and normalizes the order from a form input (%p)',
    async (dto) => {
      await expect(
        transform(dto, {
          option_key: 'teste_dev',
          option_text: 'Teste (pode apagar)',
          display_order: '2',
        }),
      ).resolves.toMatchObject({ display_order: 2 });
    },
  );

  it('accepts creating a question and linking it to a version', async () => {
    await expect(
      transform(CreateQuestionDto, {
        question_key: 'q8',
        question_text: 'Em qual area voce estava?',
        input_type: 'radio',
      }),
    ).resolves.toMatchObject({ question_key: 'q8' });
    await expect(
      transform(AddFormVersionQuestionDto, {
        question_id: questionId,
        display_order: '8',
        required: false,
      }),
    ).resolves.toMatchObject({ display_order: 8, required: false });
  });

  it('accepts tier rules with decimal bounds and unbounded ends', async () => {
    await expect(
      transform(ReplaceLeadscoreTierRulesDto, {
        items: [
          { tier_id: tierIds[0], min_score: null, max_score: '92.1' },
          { tier_id: tierIds[1], min_score: '92.1', max_score: 100.5 },
          { tier_id: tierIds[2], min_score: 100.5, max_score: null },
        ],
      }),
    ).resolves.toMatchObject({
      items: [
        { min_score: null, max_score: 92.1 },
        { min_score: 92.1, max_score: 100.5 },
        { min_score: 100.5, max_score: null },
      ],
    });
  });

  it.each([
    [CreateLeadscoreDto, { name: 'Score', active: true }],
    [UpdateLeadscoreDto, { active: false }],
    [CreateLeadscoreTierDto, { code: 'A', name: 'Tier A' }],
    [UpdateLeadscoreTierDto, { name: 'Tier A+' }],
    [
      ReplaceLeadscoreOptionPointsDto,
      {
        items: [
          { question_id: questionId, option_id: optionId, points: '14.78' },
        ],
      },
    ],
    [
      ReplaceLeadscoreRangePointsDto,
      {
        items: [
          {
            question_id: questionId,
            min_value: null,
            max_value: '25',
            points: 9.4,
          },
        ],
      },
    ],
    [
      ReorderFormVersionQuestionsDto,
      {
        items: [
          { question_id: questionId, display_order: '1', required: true },
        ],
      },
    ],
  ])('accepts documented fields for %p', async (dto, body) => {
    await expect(transform(dto, body)).resolves.toBeInstanceOf(dto);
  });

  it.each([
    ReplaceLeadscoreTierRulesDto,
    ReplaceLeadscoreOptionPointsDto,
    ReplaceLeadscoreRangePointsDto,
    ReorderFormVersionQuestionsDto,
  ])(
    'allows an empty replacement but rejects malformed items for %p',
    async (dto) => {
      await expect(transform(dto, { items: [] })).resolves.toMatchObject({
        items: [],
      });
      for (const body of [
        {},
        { items: {} },
        { items: [null] },
        { items: ['invalid'] },
        { items: [{}] },
      ]) {
        await expect(transform(dto, body)).rejects.toMatchObject({
          status: 400,
        });
      }
    },
  );

  it.each([
    { tier_id: 'invalid', min_score: 1 },
    { tier_id: tierIds[0], min_score: 'abc' },
    { tier_id: tierIds[0], min_score: '' },
    { tier_id: tierIds[0], min_score: true },
    { tier_id: tierIds[0], max_score: Infinity },
    { tier_id: tierIds[0], extra: true },
  ])('rejects invalid nested tier rules: %p', async (item) => {
    await expect(
      transform(ReplaceLeadscoreTierRulesDto, { items: [item] }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it.each([true, '', 'abc', 1.5, [], {}])(
    'rejects invalid option order: %p',
    async (display_order) => {
      await expect(
        transform(CreateQuestionOptionDto, {
          option_key: 'test',
          display_order,
        }),
      ).rejects.toMatchObject({ status: 400 });
    },
  );
});
