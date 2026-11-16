export const LEAD_SHEET_HEADERS = [
  'capture_id',
  'data',
  'nome',
  'email',
  'telefone',
  'lancamento',
  'temporada',
  'tag_id',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'utm_id',
] as const;

export type SheetDestination = {
  spreadsheet_id: string;
  sheet_name: string;
  sheet_id: number;
};

export type SheetJob = SheetDestination & {
  id: string;
  capture_id: string;
  values: string[];
  sheet_row: number | null;
  attempt_count: number;
};
