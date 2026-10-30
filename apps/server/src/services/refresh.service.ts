import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { IngestionService } from '../ingestion/ingestion.service';
import {
  INGESTION_SCHEDULES,
  REFRESH_CRON,
  REFRESH_TIME_ZONE,
  type IngestionSchedule,
} from '../ingestion/schedules';
import { VectorizationService } from '../vector/vectorization.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Register one cron job per refresh frequency while allowing either workflow to run independently. */
@Injectable()
export class RefreshService implements OnModuleInit {
  private readonly logger = new Logger(RefreshService.name);
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly ingestion: IngestionService,
    private readonly vectorization: VectorizationService,
    private readonly scheduler: SchedulerRegistry,
  ) {}

  onModuleInit(): void {
    for (const schedule of INGESTION_SCHEDULES) {
      const job = CronJob.from({
        cronTime: REFRESH_CRON,
        timeZone: REFRESH_TIME_ZONE,
        onTick: () => this.trigger(schedule),
      });
      this.scheduler.addCronJob(`ingest-${schedule.name}`, job);
      job.start();
    }
  }

  /**
   * Ticks run one after another. The first due tick captures every due schedule together, so a
   * morning with several due frequencies ingests once and rebuilds the index once.
   */
  trigger(schedule: IngestionSchedule): Promise<void> {
    this.queue = this.queue
      .then(() => this.refresh(schedule))
      .catch((error) => this.logger.error(`Scheduled refresh failed: ${String(error)}`));
    return this.queue;
  }

  /** Ingest the due topics, then rebuild from the database, including retained older sources. */
  private async refresh(trigger: IngestionSchedule): Promise<void> {
    const now = new Date();
    if (!(await this.isDue(trigger, now))) return;
    const due: IngestionSchedule[] = [];
    for (const schedule of INGESTION_SCHEDULES) {
      if (await this.isDue(schedule, now)) due.push(schedule);
    }
    this.logger.log(`Refreshing schedules: ${due.map((schedule) => schedule.name).join(', ')}`);
    const result = await this.ingestion.run(due.flatMap((schedule) => schedule.topics));
    // A busy workflow lock leaves the schedules due, so the next morning retries them.
    if (result.status !== 'already-running') await this.vectorization.run();
  }

  private async isDue(schedule: IngestionSchedule, now: Date): Promise<boolean> {
    const last = await this.ingestion.lastCapturedAt(schedule.topics);
    // Half a day of slack stops a run that started a few minutes late from slipping a whole day.
    return !last || now.getTime() - last.getTime() >= (schedule.everyDays - 0.5) * DAY_MS;
  }
}
