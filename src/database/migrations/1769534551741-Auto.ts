import { MigrationInterface, QueryRunner } from 'typeorm';

export class Auto1769534551741 implements MigrationInterface {
  name = 'Auto1769534551741';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "platform" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "name" text NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_c33d6abeebd214bd2850bfd6b8e" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "ad_account" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "name" text NOT NULL,
                "external_reference" jsonb,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "platform_id" uuid,
                CONSTRAINT "PK_287390d9905b2dc2a2651249baf" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "campaign" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "name" text NOT NULL,
                "external_ids" jsonb,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "platform_id" uuid,
                "ad_account_id" uuid,
                CONSTRAINT "PK_0ce34d26e7f2eb316a3a592cdc4" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "campaign_daily_performance" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "day" date NOT NULL,
                "metrics" jsonb,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "platform_id" uuid,
                "ad_account_id" uuid,
                "campaign_id" uuid,
                CONSTRAINT "PK_598a0dd9aa894d12b836ac9cad3" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "launch" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "name" text NOT NULL,
                "active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_0efd83695074312cab129ff59f0" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "season" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "name" text NOT NULL,
                "active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "launch_id" uuid,
                CONSTRAINT "PK_8ac0d081dbdb7ab02d166bcda9f" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "form" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "name" text NOT NULL,
                "type" text,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "launch_id" uuid,
                "season_id" uuid,
                CONSTRAINT "PK_8f72b95aa2f8ba82cf95dc7579e" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "form_version" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "version_number" integer NOT NULL,
                "active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "form_id" uuid NOT NULL,
                CONSTRAINT "PK_5992da09af1567a95aec97bcf9f" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "strategy" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "name" text NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "platform_id" uuid,
                CONSTRAINT "PK_733d2c3d4a73c020375b9b3581d" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "temperature" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "name" text NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_3b69dc45d57daf28f4b930eb4c9" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "person" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "nome_consolidado" text,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_5fdaf670315c4b7e70cce85daa3" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "capture" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "occurred_at" TIMESTAMP WITH TIME ZONE,
                "page" text,
                "path" text,
                "utm_source" text,
                "utm_medium" text,
                "utm_campaign" text,
                "utm_content" text,
                "utm_term" text,
                "utm_id" text,
                "utms" jsonb,
                "metadata" jsonb,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "person_id" uuid,
                "platform_id" uuid,
                "strategy_id" uuid,
                "temperature_id" uuid,
                "launch_id" uuid,
                "season_id" uuid,
                "form_version_id" uuid,
                CONSTRAINT "PK_b0d9e7af405727c1d572aaad438" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "attribution_touch" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "occurred_at" TIMESTAMP WITH TIME ZONE,
                "traffic_ids" jsonb,
                "touch_type" text,
                "weight" double precision,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "person_id" uuid,
                "capture_id" uuid,
                "platform_id" uuid,
                CONSTRAINT "PK_45e3b46ba23a12a1a5f476f4396" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "identifier_source" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "code" text NOT NULL,
                "description" text,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_9e5873234103c363261ced1b310" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_2f4d347b5d250a9b5bec408956" ON "identifier_source" ("code")
        `);
    await queryRunner.query(`
            CREATE TABLE "dedupe_match_log" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "matched_by" text,
                "matched_value_hash" text,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "capture_id" uuid NOT NULL,
                "person_id" uuid,
                "identifier_source_id" uuid,
                CONSTRAINT "PK_60751a92258f2a8babb3cc6e42d" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "identifier_type" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "code" text NOT NULL,
                "description" text,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_5cc521410293064915ff678922d" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_d76a8f7092d09ed6c9df0aae14" ON "identifier_type" ("code")
        `);
    await queryRunner.query(`
            CREATE TABLE "person_identifier" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "value_normalized" text NOT NULL,
                "value_hash" text,
                "is_primary" boolean NOT NULL DEFAULT false,
                "verified_at" TIMESTAMP WITH TIME ZONE,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "person_id" uuid NOT NULL,
                "identifier_type_id" uuid NOT NULL,
                CONSTRAINT "PK_c730cbe37eb205520bcfbbd171d" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_fec562dd02bf8374ebade70bca" ON "person_identifier" ("identifier_type_id", "value_normalized")
        `);
    await queryRunner.query(`
            CREATE TABLE "form_response" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "submitted_at" TIMESTAMP WITH TIME ZONE,
                "raw_payload" jsonb,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "form_version_id" uuid NOT NULL,
                "person_id" uuid,
                "capture_id" uuid,
                CONSTRAINT "PK_590558d307109b9ee2aa8f8e8e2" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "question" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "question_key" text NOT NULL,
                "question_text" text,
                "input_type" text,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "form_id" uuid NOT NULL,
                CONSTRAINT "PK_21e5786aa0ea704ae185a79b2d5" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "question_option" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "option_key" text NOT NULL,
                "option_text" text,
                "display_order" integer NOT NULL DEFAULT '0',
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "question_id" uuid NOT NULL,
                CONSTRAINT "PK_64f8e42188891f2b0610017c8f9" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "form_answer" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "answer_text" text,
                "answer_number" double precision,
                "answer_bool" boolean,
                "answered_at" TIMESTAMP WITH TIME ZONE,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "form_response_id" uuid NOT NULL,
                "question_id" uuid NOT NULL,
                "option_id" uuid,
                CONSTRAINT "PK_18043b968b1e988a4da85bb1666" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "form_version_question" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "display_order" integer NOT NULL DEFAULT '0',
                "required" boolean NOT NULL DEFAULT false,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "form_version_id" uuid NOT NULL,
                "question_id" uuid NOT NULL,
                CONSTRAINT "PK_eeb7d0107ea1de7b457ac93e3dc" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "leadscore" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "name" text NOT NULL,
                "active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "form_version_id" uuid NOT NULL,
                CONSTRAINT "PK_1d9dce0348385a4ba487991750b" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "leadscore_option_points" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "points" double precision NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "leadscore_id" uuid NOT NULL,
                "question_id" uuid NOT NULL,
                "option_id" uuid NOT NULL,
                CONSTRAINT "PK_91738a623f72080ead15e56f95e" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "leadscore_range_points" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "min_value" double precision,
                "max_value" double precision,
                "points" double precision NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "leadscore_id" uuid NOT NULL,
                "question_id" uuid NOT NULL,
                CONSTRAINT "PK_6c1996b69849787c32e4fa7220c" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "leadscore_tier" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "code" text NOT NULL,
                "name" text NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_13a5a792b1372dff849abab9608" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_452b2d2c8b44eabc2430d186c1" ON "leadscore_tier" ("code")
        `);
    await queryRunner.query(`
            CREATE TABLE "leadscore_result" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "score_total" double precision,
                "breakdown" jsonb,
                "calculated_at" TIMESTAMP WITH TIME ZONE,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "leadscore_id" uuid NOT NULL,
                "form_response_id" uuid NOT NULL,
                "tier_id" uuid,
                CONSTRAINT "PK_70730ff5b45c156321b3d1b17f8" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "leadscore_tier_rule" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "min_score" double precision,
                "max_score" double precision,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "leadscore_id" uuid NOT NULL,
                "tier_id" uuid NOT NULL,
                CONSTRAINT "PK_04f6d34112789833df76a242fa8" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "user" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "name" text NOT NULL,
                "email" text NOT NULL,
                "password_hash" text NOT NULL,
                "active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP WITH TIME ZONE,
                "last_login" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_e12875dfb3b1d92d7d7c5377e2" ON "user" ("email")
        `);
    await queryRunner.query(`
            CREATE TABLE "invite" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "token" text NOT NULL,
                "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "used" boolean NOT NULL DEFAULT false,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "invited_by" uuid,
                CONSTRAINT "PK_fc9fa190e5a3c5d80604a4f63e1" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_83dbe83cb33c3e8468c8045ea7" ON "invite" ("token")
        `);
    await queryRunner.query(`
            CREATE TABLE "password_reset" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "token" text NOT NULL,
                "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "used" boolean NOT NULL DEFAULT false,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "requested_by" uuid,
                CONSTRAINT "PK_8515e60a2cc41584fa4784f52ce" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_36e929b98372d961bb63bd4b4e" ON "password_reset" ("token")
        `);
    await queryRunner.query(`
            ALTER TABLE "ad_account"
            ADD CONSTRAINT "FK_89c32276020ca0004b51c2ea043" FOREIGN KEY ("platform_id") REFERENCES "platform"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "campaign"
            ADD CONSTRAINT "FK_1ea482818923ae69a63c2da1d40" FOREIGN KEY ("platform_id") REFERENCES "platform"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "campaign"
            ADD CONSTRAINT "FK_bfcd5f58df135afb954f776ec51" FOREIGN KEY ("ad_account_id") REFERENCES "ad_account"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "campaign_daily_performance"
            ADD CONSTRAINT "FK_69089fc9dcf55f9a52206652889" FOREIGN KEY ("platform_id") REFERENCES "platform"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "campaign_daily_performance"
            ADD CONSTRAINT "FK_d9b7ba14db847318182a12916fb" FOREIGN KEY ("ad_account_id") REFERENCES "ad_account"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "campaign_daily_performance"
            ADD CONSTRAINT "FK_615728aa4267f958826b3a78a7e" FOREIGN KEY ("campaign_id") REFERENCES "campaign"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "season"
            ADD CONSTRAINT "FK_7500ee80f091ca03eea57e75f0c" FOREIGN KEY ("launch_id") REFERENCES "launch"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "form"
            ADD CONSTRAINT "FK_bc924533858b9995837d0b07144" FOREIGN KEY ("launch_id") REFERENCES "launch"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "form"
            ADD CONSTRAINT "FK_8e0a6f1b8e91f46bd0b1acb8bb3" FOREIGN KEY ("season_id") REFERENCES "season"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "form_version"
            ADD CONSTRAINT "FK_c212f6d8dc4ef30d333b8fb4c00" FOREIGN KEY ("form_id") REFERENCES "form"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "strategy"
            ADD CONSTRAINT "FK_9262a59d2571315513d80604b1e" FOREIGN KEY ("platform_id") REFERENCES "platform"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "capture"
            ADD CONSTRAINT "FK_6841967f196c47efd425c43e14f" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "capture"
            ADD CONSTRAINT "FK_70a06b7d6f10e8a82004a999497" FOREIGN KEY ("platform_id") REFERENCES "platform"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "capture"
            ADD CONSTRAINT "FK_89dca112ec8831fceb9c1f637ff" FOREIGN KEY ("strategy_id") REFERENCES "strategy"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "capture"
            ADD CONSTRAINT "FK_924a468bf56142cecad9163a58a" FOREIGN KEY ("temperature_id") REFERENCES "temperature"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "capture"
            ADD CONSTRAINT "FK_d73f55892997fcad06b4129fcd4" FOREIGN KEY ("launch_id") REFERENCES "launch"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "capture"
            ADD CONSTRAINT "FK_70523d09d81e9a918fbba5ada5a" FOREIGN KEY ("season_id") REFERENCES "season"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "capture"
            ADD CONSTRAINT "FK_1d416960296c8f47aee32d72fbf" FOREIGN KEY ("form_version_id") REFERENCES "form_version"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "attribution_touch"
            ADD CONSTRAINT "FK_ca4b564f740c4f2acd6e847aca0" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "attribution_touch"
            ADD CONSTRAINT "FK_9d00f509181527d44345cbfbfbd" FOREIGN KEY ("capture_id") REFERENCES "capture"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "attribution_touch"
            ADD CONSTRAINT "FK_9d3623ef4f48fb3c9b97c07c8af" FOREIGN KEY ("platform_id") REFERENCES "platform"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "dedupe_match_log"
            ADD CONSTRAINT "FK_889d1c55312fc8e6eb912432e87" FOREIGN KEY ("capture_id") REFERENCES "capture"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "dedupe_match_log"
            ADD CONSTRAINT "FK_4ede501710b405acde473cd1951" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "dedupe_match_log"
            ADD CONSTRAINT "FK_40c17e69aeb2b09b09af47357d5" FOREIGN KEY ("identifier_source_id") REFERENCES "identifier_source"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "person_identifier"
            ADD CONSTRAINT "FK_1c1b4a1fd3d169e188e0bacab5c" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "person_identifier"
            ADD CONSTRAINT "FK_bb72749d4831c6a7cefbcf62dd5" FOREIGN KEY ("identifier_type_id") REFERENCES "identifier_type"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "form_response"
            ADD CONSTRAINT "FK_d1f0ad9444e2f7599c07fb5b230" FOREIGN KEY ("form_version_id") REFERENCES "form_version"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "form_response"
            ADD CONSTRAINT "FK_f360c9a936d64ecb503fd1bdc68" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "form_response"
            ADD CONSTRAINT "FK_f2b232c3496bc76120cab7a47c8" FOREIGN KEY ("capture_id") REFERENCES "capture"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "question"
            ADD CONSTRAINT "FK_4c7564021a60d15e709c4760a91" FOREIGN KEY ("form_id") REFERENCES "form"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "question_option"
            ADD CONSTRAINT "FK_747190c37a39feced5efcbb303f" FOREIGN KEY ("question_id") REFERENCES "question"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "form_answer"
            ADD CONSTRAINT "FK_7ed464c33134611635ca0dcb49a" FOREIGN KEY ("form_response_id") REFERENCES "form_response"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "form_answer"
            ADD CONSTRAINT "FK_c00ab5cf0b6e530a8895f6b52cf" FOREIGN KEY ("question_id") REFERENCES "question"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "form_answer"
            ADD CONSTRAINT "FK_398e3ef00468ad5283a7b52dc99" FOREIGN KEY ("option_id") REFERENCES "question_option"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "form_version_question"
            ADD CONSTRAINT "FK_cc9c5a536fd78a62c30d0c632d8" FOREIGN KEY ("form_version_id") REFERENCES "form_version"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "form_version_question"
            ADD CONSTRAINT "FK_12e01ba634be0ecca31c3488c53" FOREIGN KEY ("question_id") REFERENCES "question"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "leadscore"
            ADD CONSTRAINT "FK_8948eda8533ad567bd744c9d307" FOREIGN KEY ("form_version_id") REFERENCES "form_version"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "leadscore_option_points"
            ADD CONSTRAINT "FK_8b6aa19c5be263af3eb00f08b33" FOREIGN KEY ("leadscore_id") REFERENCES "leadscore"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "leadscore_option_points"
            ADD CONSTRAINT "FK_f72c391cb11d93ff0f7ecbedafd" FOREIGN KEY ("question_id") REFERENCES "question"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "leadscore_option_points"
            ADD CONSTRAINT "FK_86e05645f943b23bc8baa98d0e3" FOREIGN KEY ("option_id") REFERENCES "question_option"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "leadscore_range_points"
            ADD CONSTRAINT "FK_ac206c479b5c4a41c003db2c1f8" FOREIGN KEY ("leadscore_id") REFERENCES "leadscore"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "leadscore_range_points"
            ADD CONSTRAINT "FK_e07b9be9ba7105dbb63a134b9e1" FOREIGN KEY ("question_id") REFERENCES "question"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "leadscore_result"
            ADD CONSTRAINT "FK_1a88395cccef4921d8780b599c2" FOREIGN KEY ("leadscore_id") REFERENCES "leadscore"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "leadscore_result"
            ADD CONSTRAINT "FK_0729903b1b2a516874dd8d04c48" FOREIGN KEY ("form_response_id") REFERENCES "form_response"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "leadscore_result"
            ADD CONSTRAINT "FK_f2acabe3d12e8d91ec6c0d5f817" FOREIGN KEY ("tier_id") REFERENCES "leadscore_tier"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "leadscore_tier_rule"
            ADD CONSTRAINT "FK_93cb4e990eb9e147580628f8910" FOREIGN KEY ("leadscore_id") REFERENCES "leadscore"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "leadscore_tier_rule"
            ADD CONSTRAINT "FK_3ff1d220dca5ca896ef608364d7" FOREIGN KEY ("tier_id") REFERENCES "leadscore_tier"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "invite"
            ADD CONSTRAINT "FK_0ec0f3f0826be57a9c1bcc2946e" FOREIGN KEY ("invited_by") REFERENCES "user"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "password_reset"
            ADD CONSTRAINT "FK_1065f3a740746b8401c7270bdc4" FOREIGN KEY ("requested_by") REFERENCES "user"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "password_reset" DROP CONSTRAINT "FK_1065f3a740746b8401c7270bdc4"
        `);
    await queryRunner.query(`
            ALTER TABLE "invite" DROP CONSTRAINT "FK_0ec0f3f0826be57a9c1bcc2946e"
        `);
    await queryRunner.query(`
            ALTER TABLE "leadscore_tier_rule" DROP CONSTRAINT "FK_3ff1d220dca5ca896ef608364d7"
        `);
    await queryRunner.query(`
            ALTER TABLE "leadscore_tier_rule" DROP CONSTRAINT "FK_93cb4e990eb9e147580628f8910"
        `);
    await queryRunner.query(`
            ALTER TABLE "leadscore_result" DROP CONSTRAINT "FK_f2acabe3d12e8d91ec6c0d5f817"
        `);
    await queryRunner.query(`
            ALTER TABLE "leadscore_result" DROP CONSTRAINT "FK_0729903b1b2a516874dd8d04c48"
        `);
    await queryRunner.query(`
            ALTER TABLE "leadscore_result" DROP CONSTRAINT "FK_1a88395cccef4921d8780b599c2"
        `);
    await queryRunner.query(`
            ALTER TABLE "leadscore_range_points" DROP CONSTRAINT "FK_e07b9be9ba7105dbb63a134b9e1"
        `);
    await queryRunner.query(`
            ALTER TABLE "leadscore_range_points" DROP CONSTRAINT "FK_ac206c479b5c4a41c003db2c1f8"
        `);
    await queryRunner.query(`
            ALTER TABLE "leadscore_option_points" DROP CONSTRAINT "FK_86e05645f943b23bc8baa98d0e3"
        `);
    await queryRunner.query(`
            ALTER TABLE "leadscore_option_points" DROP CONSTRAINT "FK_f72c391cb11d93ff0f7ecbedafd"
        `);
    await queryRunner.query(`
            ALTER TABLE "leadscore_option_points" DROP CONSTRAINT "FK_8b6aa19c5be263af3eb00f08b33"
        `);
    await queryRunner.query(`
            ALTER TABLE "leadscore" DROP CONSTRAINT "FK_8948eda8533ad567bd744c9d307"
        `);
    await queryRunner.query(`
            ALTER TABLE "form_version_question" DROP CONSTRAINT "FK_12e01ba634be0ecca31c3488c53"
        `);
    await queryRunner.query(`
            ALTER TABLE "form_version_question" DROP CONSTRAINT "FK_cc9c5a536fd78a62c30d0c632d8"
        `);
    await queryRunner.query(`
            ALTER TABLE "form_answer" DROP CONSTRAINT "FK_398e3ef00468ad5283a7b52dc99"
        `);
    await queryRunner.query(`
            ALTER TABLE "form_answer" DROP CONSTRAINT "FK_c00ab5cf0b6e530a8895f6b52cf"
        `);
    await queryRunner.query(`
            ALTER TABLE "form_answer" DROP CONSTRAINT "FK_7ed464c33134611635ca0dcb49a"
        `);
    await queryRunner.query(`
            ALTER TABLE "question_option" DROP CONSTRAINT "FK_747190c37a39feced5efcbb303f"
        `);
    await queryRunner.query(`
            ALTER TABLE "question" DROP CONSTRAINT "FK_4c7564021a60d15e709c4760a91"
        `);
    await queryRunner.query(`
            ALTER TABLE "form_response" DROP CONSTRAINT "FK_f2b232c3496bc76120cab7a47c8"
        `);
    await queryRunner.query(`
            ALTER TABLE "form_response" DROP CONSTRAINT "FK_f360c9a936d64ecb503fd1bdc68"
        `);
    await queryRunner.query(`
            ALTER TABLE "form_response" DROP CONSTRAINT "FK_d1f0ad9444e2f7599c07fb5b230"
        `);
    await queryRunner.query(`
            ALTER TABLE "person_identifier" DROP CONSTRAINT "FK_bb72749d4831c6a7cefbcf62dd5"
        `);
    await queryRunner.query(`
            ALTER TABLE "person_identifier" DROP CONSTRAINT "FK_1c1b4a1fd3d169e188e0bacab5c"
        `);
    await queryRunner.query(`
            ALTER TABLE "dedupe_match_log" DROP CONSTRAINT "FK_40c17e69aeb2b09b09af47357d5"
        `);
    await queryRunner.query(`
            ALTER TABLE "dedupe_match_log" DROP CONSTRAINT "FK_4ede501710b405acde473cd1951"
        `);
    await queryRunner.query(`
            ALTER TABLE "dedupe_match_log" DROP CONSTRAINT "FK_889d1c55312fc8e6eb912432e87"
        `);
    await queryRunner.query(`
            ALTER TABLE "attribution_touch" DROP CONSTRAINT "FK_9d3623ef4f48fb3c9b97c07c8af"
        `);
    await queryRunner.query(`
            ALTER TABLE "attribution_touch" DROP CONSTRAINT "FK_9d00f509181527d44345cbfbfbd"
        `);
    await queryRunner.query(`
            ALTER TABLE "attribution_touch" DROP CONSTRAINT "FK_ca4b564f740c4f2acd6e847aca0"
        `);
    await queryRunner.query(`
            ALTER TABLE "capture" DROP CONSTRAINT "FK_1d416960296c8f47aee32d72fbf"
        `);
    await queryRunner.query(`
            ALTER TABLE "capture" DROP CONSTRAINT "FK_70523d09d81e9a918fbba5ada5a"
        `);
    await queryRunner.query(`
            ALTER TABLE "capture" DROP CONSTRAINT "FK_d73f55892997fcad06b4129fcd4"
        `);
    await queryRunner.query(`
            ALTER TABLE "capture" DROP CONSTRAINT "FK_924a468bf56142cecad9163a58a"
        `);
    await queryRunner.query(`
            ALTER TABLE "capture" DROP CONSTRAINT "FK_89dca112ec8831fceb9c1f637ff"
        `);
    await queryRunner.query(`
            ALTER TABLE "capture" DROP CONSTRAINT "FK_70a06b7d6f10e8a82004a999497"
        `);
    await queryRunner.query(`
            ALTER TABLE "capture" DROP CONSTRAINT "FK_6841967f196c47efd425c43e14f"
        `);
    await queryRunner.query(`
            ALTER TABLE "strategy" DROP CONSTRAINT "FK_9262a59d2571315513d80604b1e"
        `);
    await queryRunner.query(`
            ALTER TABLE "form_version" DROP CONSTRAINT "FK_c212f6d8dc4ef30d333b8fb4c00"
        `);
    await queryRunner.query(`
            ALTER TABLE "form" DROP CONSTRAINT "FK_8e0a6f1b8e91f46bd0b1acb8bb3"
        `);
    await queryRunner.query(`
            ALTER TABLE "form" DROP CONSTRAINT "FK_bc924533858b9995837d0b07144"
        `);
    await queryRunner.query(`
            ALTER TABLE "season" DROP CONSTRAINT "FK_7500ee80f091ca03eea57e75f0c"
        `);
    await queryRunner.query(`
            ALTER TABLE "campaign_daily_performance" DROP CONSTRAINT "FK_615728aa4267f958826b3a78a7e"
        `);
    await queryRunner.query(`
            ALTER TABLE "campaign_daily_performance" DROP CONSTRAINT "FK_d9b7ba14db847318182a12916fb"
        `);
    await queryRunner.query(`
            ALTER TABLE "campaign_daily_performance" DROP CONSTRAINT "FK_69089fc9dcf55f9a52206652889"
        `);
    await queryRunner.query(`
            ALTER TABLE "campaign" DROP CONSTRAINT "FK_bfcd5f58df135afb954f776ec51"
        `);
    await queryRunner.query(`
            ALTER TABLE "campaign" DROP CONSTRAINT "FK_1ea482818923ae69a63c2da1d40"
        `);
    await queryRunner.query(`
            ALTER TABLE "ad_account" DROP CONSTRAINT "FK_89c32276020ca0004b51c2ea043"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_36e929b98372d961bb63bd4b4e"
        `);
    await queryRunner.query(`
            DROP TABLE "password_reset"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_83dbe83cb33c3e8468c8045ea7"
        `);
    await queryRunner.query(`
            DROP TABLE "invite"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_e12875dfb3b1d92d7d7c5377e2"
        `);
    await queryRunner.query(`
            DROP TABLE "user"
        `);
    await queryRunner.query(`
            DROP TABLE "leadscore_tier_rule"
        `);
    await queryRunner.query(`
            DROP TABLE "leadscore_result"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_452b2d2c8b44eabc2430d186c1"
        `);
    await queryRunner.query(`
            DROP TABLE "leadscore_tier"
        `);
    await queryRunner.query(`
            DROP TABLE "leadscore_range_points"
        `);
    await queryRunner.query(`
            DROP TABLE "leadscore_option_points"
        `);
    await queryRunner.query(`
            DROP TABLE "leadscore"
        `);
    await queryRunner.query(`
            DROP TABLE "form_version_question"
        `);
    await queryRunner.query(`
            DROP TABLE "form_answer"
        `);
    await queryRunner.query(`
            DROP TABLE "question_option"
        `);
    await queryRunner.query(`
            DROP TABLE "question"
        `);
    await queryRunner.query(`
            DROP TABLE "form_response"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_fec562dd02bf8374ebade70bca"
        `);
    await queryRunner.query(`
            DROP TABLE "person_identifier"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_d76a8f7092d09ed6c9df0aae14"
        `);
    await queryRunner.query(`
            DROP TABLE "identifier_type"
        `);
    await queryRunner.query(`
            DROP TABLE "dedupe_match_log"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_2f4d347b5d250a9b5bec408956"
        `);
    await queryRunner.query(`
            DROP TABLE "identifier_source"
        `);
    await queryRunner.query(`
            DROP TABLE "attribution_touch"
        `);
    await queryRunner.query(`
            DROP TABLE "capture"
        `);
    await queryRunner.query(`
            DROP TABLE "person"
        `);
    await queryRunner.query(`
            DROP TABLE "temperature"
        `);
    await queryRunner.query(`
            DROP TABLE "strategy"
        `);
    await queryRunner.query(`
            DROP TABLE "form_version"
        `);
    await queryRunner.query(`
            DROP TABLE "form"
        `);
    await queryRunner.query(`
            DROP TABLE "season"
        `);
    await queryRunner.query(`
            DROP TABLE "launch"
        `);
    await queryRunner.query(`
            DROP TABLE "campaign_daily_performance"
        `);
    await queryRunner.query(`
            DROP TABLE "campaign"
        `);
    await queryRunner.query(`
            DROP TABLE "ad_account"
        `);
    await queryRunner.query(`
            DROP TABLE "platform"
        `);
  }
}
