import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddV2ExternalKeysAndRelations1770000000035
  implements MigrationInterface
{
  name = 'AddV2ExternalKeysAndRelations1770000000035';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "account_platform"
      ADD CONSTRAINT "UQ_account_platform_external_account_id"
      UNIQUE ("external_account_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "campaign"
      ADD CONSTRAINT "UQ_campaign_external_campaign_id"
      UNIQUE ("external_campaign_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "ad_set"
      ADD CONSTRAINT "UQ_ad_set_external_adset_id"
      UNIQUE ("external_adset_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "ad"
      ADD CONSTRAINT "UQ_ad_external_ad_id"
      UNIQUE ("external_ad_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "ad_performance_daily_summary"
      ADD CONSTRAINT "FK_ad_performance_daily_summary_external_campaign_id"
      FOREIGN KEY ("external_campaign_id") REFERENCES "campaign"("external_campaign_id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "ad_performance_daily_summary"
      ADD CONSTRAINT "FK_ad_performance_daily_summary_external_adset_id"
      FOREIGN KEY ("external_adset_id") REFERENCES "ad_set"("external_adset_id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "ad_performance_daily_summary"
      ADD CONSTRAINT "FK_ad_performance_daily_summary_external_ad_id"
      FOREIGN KEY ("external_ad_id") REFERENCES "ad"("external_ad_id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "meta_ad_daily_performance_all_metrics"
      ADD CONSTRAINT "FK_meta_ad_daily_performance_all_metrics_external_account_id"
      FOREIGN KEY ("external_account_id") REFERENCES "account_platform"("external_account_id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "meta_ad_daily_performance_all_metrics"
      ADD CONSTRAINT "FK_meta_ad_daily_performance_all_metrics_external_campaign_id"
      FOREIGN KEY ("external_campaign_id") REFERENCES "campaign"("external_campaign_id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "meta_ad_daily_performance_all_metrics"
      ADD CONSTRAINT "FK_meta_ad_daily_performance_all_metrics_external_ad_set_id"
      FOREIGN KEY ("external_ad_set_id") REFERENCES "ad_set"("external_adset_id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "meta_ad_daily_performance_all_metrics"
      ADD CONSTRAINT "FK_meta_ad_daily_performance_all_metrics_external_ad_id"
      FOREIGN KEY ("external_ad_id") REFERENCES "ad"("external_ad_id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "meta_ad_configuration"
      ADD CONSTRAINT "FK_meta_ad_configuration_external_ad_id"
      FOREIGN KEY ("external_ad_id") REFERENCES "ad"("external_ad_id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "meta_ad_set_configuration"
      ADD CONSTRAINT "FK_meta_ad_set_configuration_external_ad_set_id"
      FOREIGN KEY ("external_ad_set_id") REFERENCES "ad_set"("external_adset_id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "meta_campaign_configuration"
      ADD CONSTRAINT "FK_meta_campaign_configuration_external_campaign_id"
      FOREIGN KEY ("external_campaign_id") REFERENCES "campaign"("external_campaign_id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "google_campaign_configuration"
      ADD CONSTRAINT "FK_google_campaign_configuration_external_campaign_id"
      FOREIGN KEY ("external_campaign_id") REFERENCES "campaign"("external_campaign_id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "google_ad_set_configuration"
      ADD CONSTRAINT "FK_google_ad_set_configuration_external_adset_id"
      FOREIGN KEY ("external_adset_id") REFERENCES "ad_set"("external_adset_id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "google_ad_configuration"
      ADD CONSTRAINT "FK_google_ad_configuration_external_ad_id"
      FOREIGN KEY ("external_ad_id") REFERENCES "ad"("external_ad_id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "google_ad_asset_performance"
      ADD CONSTRAINT "FK_google_ad_asset_performance_external_ad_id"
      FOREIGN KEY ("external_ad_id") REFERENCES "ad"("external_ad_id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "google_keyword_performance"
      ADD CONSTRAINT "FK_google_keyword_performance_external_adset_id"
      FOREIGN KEY ("external_adset_id") REFERENCES "ad_set"("external_adset_id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "google_campaign_auction_insights"
      ADD CONSTRAINT "FK_google_campaign_auction_insights_external_campaign_id"
      FOREIGN KEY ("external_campaign_id") REFERENCES "campaign"("external_campaign_id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "ga4_daily_source_performance"
      ADD CONSTRAINT "FK_ga4_daily_source_performance_external_property_id"
      FOREIGN KEY ("external_property_id") REFERENCES "account_platform"("external_account_id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "ga4_daily_source_performance"
      ADD CONSTRAINT "FK_ga4_daily_source_performance_external_ad_id"
      FOREIGN KEY ("external_ad_id") REFERENCES "ad"("external_ad_id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ga4_daily_source_performance"
      DROP CONSTRAINT "FK_ga4_daily_source_performance_external_ad_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "ga4_daily_source_performance"
      DROP CONSTRAINT "FK_ga4_daily_source_performance_external_property_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "google_campaign_auction_insights"
      DROP CONSTRAINT "FK_google_campaign_auction_insights_external_campaign_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "google_keyword_performance"
      DROP CONSTRAINT "FK_google_keyword_performance_external_adset_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "google_ad_asset_performance"
      DROP CONSTRAINT "FK_google_ad_asset_performance_external_ad_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "google_ad_configuration"
      DROP CONSTRAINT "FK_google_ad_configuration_external_ad_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "google_ad_set_configuration"
      DROP CONSTRAINT "FK_google_ad_set_configuration_external_adset_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "google_campaign_configuration"
      DROP CONSTRAINT "FK_google_campaign_configuration_external_campaign_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "meta_campaign_configuration"
      DROP CONSTRAINT "FK_meta_campaign_configuration_external_campaign_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "meta_ad_set_configuration"
      DROP CONSTRAINT "FK_meta_ad_set_configuration_external_ad_set_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "meta_ad_configuration"
      DROP CONSTRAINT "FK_meta_ad_configuration_external_ad_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "meta_ad_daily_performance_all_metrics"
      DROP CONSTRAINT "FK_meta_ad_daily_performance_all_metrics_external_ad_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "meta_ad_daily_performance_all_metrics"
      DROP CONSTRAINT "FK_meta_ad_daily_performance_all_metrics_external_ad_set_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "meta_ad_daily_performance_all_metrics"
      DROP CONSTRAINT "FK_meta_ad_daily_performance_all_metrics_external_campaign_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "meta_ad_daily_performance_all_metrics"
      DROP CONSTRAINT "FK_meta_ad_daily_performance_all_metrics_external_account_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "ad_performance_daily_summary"
      DROP CONSTRAINT "FK_ad_performance_daily_summary_external_ad_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "ad_performance_daily_summary"
      DROP CONSTRAINT "FK_ad_performance_daily_summary_external_adset_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "ad_performance_daily_summary"
      DROP CONSTRAINT "FK_ad_performance_daily_summary_external_campaign_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "ad"
      DROP CONSTRAINT "UQ_ad_external_ad_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "ad_set"
      DROP CONSTRAINT "UQ_ad_set_external_adset_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "campaign"
      DROP CONSTRAINT "UQ_campaign_external_campaign_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "account_platform"
      DROP CONSTRAINT "UQ_account_platform_external_account_id"
    `);
  }
}
