import { Injectable, Logger } from '@nestjs/common';
import { MetaAdsOAuthService } from '../oauth/meta-ads-oauth.service';
import { MetaInsightRow } from './meta-batch.service';

export type AsyncJobStatus = {
  id: string;
  async_status:
    | 'Job Not Started'
    | 'Job Started'
    | 'Job Running'
    | 'Job Complete'
    | 'Job Completed'
    | 'Job Failed'
    | 'Job Skipped';
  async_percent_completion: number;
  date_start?: string;
  date_stop?: string;
};

export type StartInsightsJobResult = {
  report_run_id: string;
};

@Injectable()
export class MetaJobService {
  private readonly logger = new Logger(MetaJobService.name);

  constructor(private readonly metaOAuthService: MetaAdsOAuthService) {}

  private getBaseUrl() {
    return this.metaOAuthService.getGraphBaseUrl();
  }

  /**
   * Starts an async insights job (for large date ranges or node-level queries).
   * Returns a report_run_id to poll via checkJob / getJobResults.
   */
  async startInsightsJob(params: {
    connectionId: string;
    nodeId: string;
    fields: string[];
    level: string;
    since: string;
    until: string;
    breakdowns?: string;
  }): Promise<StartInsightsJobResult> {
    const accessToken =
      await this.metaOAuthService.getAuthorizedAccessTokenForConnection(
        params.connectionId,
      );

    const url = `${this.getBaseUrl()}/${params.nodeId}/insights`;
    const body = new URLSearchParams();
    body.set('access_token', accessToken);
    body.set('fields', params.fields.join(','));
    body.set('level', params.level);
    body.set(
      'time_range',
      JSON.stringify({ since: params.since, until: params.until }),
    );
    body.set('time_increment', '1');
    if (params.breakdowns) {
      body.set('breakdowns', params.breakdowns);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Failed to start insights job: ${response.status} ${text}`,
      );
    }

    const json = (await response.json()) as StartInsightsJobResult;
    this.logger.log(`Started async insights job: ${json.report_run_id}`);
    return json;
  }

  /**
   * Checks the status of an async insights job.
   */
  async checkJob(params: {
    connectionId: string;
    reportRunId: string;
  }): Promise<AsyncJobStatus> {
    const accessToken =
      await this.metaOAuthService.getAuthorizedAccessTokenForConnection(
        params.connectionId,
      );

    const url = new URL(`${this.getBaseUrl()}/${params.reportRunId}`);
    url.searchParams.set('access_token', accessToken);

    const response = await fetch(url.toString());
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to check job status: ${response.status} ${text}`);
    }

    return (await response.json()) as AsyncJobStatus;
  }

  /**
   * Retrieves all pages of results from a completed async insights job.
   */
  async getJobResults(params: {
    connectionId: string;
    reportRunId: string;
    limit?: number;
  }): Promise<MetaInsightRow[]> {
    const accessToken =
      await this.metaOAuthService.getAuthorizedAccessTokenForConnection(
        params.connectionId,
      );

    const allRows: MetaInsightRow[] = [];
    const pageSize = params.limit ?? 500;
    let nextUrl: string | null =
      `${this.getBaseUrl()}/${params.reportRunId}/insights?access_token=${accessToken}&limit=${pageSize}`;

    while (nextUrl) {
      const response = await fetch(nextUrl);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `Failed to retrieve job results: ${response.status} ${text}`,
        );
      }
      const json = (await response.json()) as {
        data: MetaInsightRow[];
        paging?: { next?: string };
      };
      allRows.push(...(json.data ?? []));
      nextUrl = json.paging?.next ?? null;
    }

    return allRows;
  }

  /**
   * Polls until job completes or fails. Resolves with the results.
   */
  async waitForJobAndFetch(params: {
    connectionId: string;
    reportRunId: string;
    pollIntervalMs?: number;
    maxWaitMs?: number;
  }): Promise<MetaInsightRow[]> {
    const pollInterval = params.pollIntervalMs ?? 5000;
    const maxWait = params.maxWaitMs ?? 300_000; // 5 min default
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const status = await this.checkJob({
        connectionId: params.connectionId,
        reportRunId: params.reportRunId,
      });

      this.logger.log(
        `Job ${params.reportRunId}: ${status.async_status} (${status.async_percent_completion}%)`,
      );

      if (status.async_status === 'Job Complete') {
        return this.getJobResults({
          connectionId: params.connectionId,
          reportRunId: params.reportRunId,
        });
      }

      if (
        status.async_status === 'Job Failed' ||
        status.async_status === 'Job Skipped'
      ) {
        throw new Error(
          `Async insights job failed with status: ${status.async_status}`,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(
      `Async insights job ${params.reportRunId} timed out after ${maxWait}ms`,
    );
  }
}
