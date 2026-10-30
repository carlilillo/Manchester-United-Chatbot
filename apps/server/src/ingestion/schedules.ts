export const INGESTION_TOPICS = [
  'homepage',
  'news',
  'matches',
  'people',
  'membership',
  'store',
  'travel',
  'videos',
] as const;
export type IngestionTopic = (typeof INGESTION_TOPICS)[number];

export type IngestionSchedule = {
  name: string;
  everyDays: number;
  topics: IngestionTopic[];
};

/** Every schedule's job ticks each morning, then refreshes only once its interval has elapsed. */
export const REFRESH_CRON = '0 6 * * *';
export const REFRESH_TIME_ZONE = 'Europe/Dublin';

/** Topics that share a refresh frequency are captured in the same run. */
export const INGESTION_SCHEDULES: IngestionSchedule[] = [
  { name: 'daily', everyDays: 1, topics: ['homepage', 'news', 'videos'] },
  { name: 'every-3-days', everyDays: 3, topics: ['matches', 'store'] },
  { name: 'every-30-days', everyDays: 30, topics: ['membership', 'people'] },
  { name: 'every-45-days', everyDays: 45, topics: ['travel'] },
];

export function isIngestionTopic(value: string): value is IngestionTopic {
  return (INGESTION_TOPICS as readonly string[]).includes(value);
}
