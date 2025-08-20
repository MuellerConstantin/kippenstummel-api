import * as fs from 'fs';
import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { CommandBus } from '@ocoda/event-sourcing';
import { JobHistoryService } from 'src/common/services';
import { ImportCvmsCommand } from '../commands';

@Processor('cvm-import')
export class CvmImportConsumer extends WorkerHost {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly jobHistoryService: JobHistoryService,
    private readonly logger: Logger,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case 'file': {
        return this.importFile(
          job as Job<
            {
              path: string;
              filename: string;
              mimetype: string;
              encoding: string;
            },
            void,
            string
          >,
        );
      }
      case 'osm': {
        return this.importOsm(job as Job<{ region: string }, void, string>);
      }
      case 'manual': {
        return this.importManual(
          job as Job<
            { cvms: { longitude: number; latitude: number; score: number }[] },
            void,
            string
          >,
        );
      }
    }
  }

  async importFile(
    job: Job<
      {
        path: string;
        filename: string;
        mimetype: string;
        encoding: string;
      },
      void,
      string
    >,
  ): Promise<void> {
    this.logger.debug(
      `Importing CVM data from file '${job.data.path}'...`,
      'CvmImportConsumer',
    );

    const data = await fs.promises.readFile(job.data.path);
    const content = JSON.parse(data.toString()) as {
      longitude: number;
      latitude: number;
      score: number;
    }[];

    await fs.promises.unlink(job.data.path);

    const command = new ImportCvmsCommand(content);
    await this.commandBus.execute<ImportCvmsCommand>(command);

    await job.log(`Imported ${content.length} CVMs from file`);
  }

  async importOsm(job: Job<{ region: string }, void, string>): Promise<void> {
    this.logger.debug(
      `Importing CVM data from OSM for region '${job.data.region}'...`,
      'CvmImportConsumer',
    );
    await job.log(
      `Importing CVM data from OSM for region '${job.data.region}'...`,
    );

    const fetchOsmAreaId = async (region: string) => {
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.append('q', region);
      url.searchParams.append('format', 'json');
      url.searchParams.append('limit', '1');

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Failed to fetch OSM area ID for region "${region}"`);
      }

      const data = (await response.json()) as {
        place_id: number;
        license: string;
        osm_id: string;
        osm_type: string;
        lat: string;
        lon: string;
        class: string;
        type: string;
        place_rank: number;
        importance: number;
        addresstype: string;
        name: string;
        display_name: string;
        boundingbox: string[];
      }[];

      if (!data || data.length === 0) {
        throw new Error(`Region "${region}" not found`);
      }

      const result = data[0];

      const osmId = parseInt(result.osm_id);
      const osmType = result.osm_type;

      switch (osmType) {
        case 'relation':
          return 3600000000 + osmId;
        case 'way':
          return 2400000000 + osmId;
        case 'node':
          return 1200000000 + osmId;
        default:
          throw new Error(`Unsupported osm_type: ${osmType}`);
      }
    };

    const fetchOsmData = async (areaId: number) => {
      const query = `
        [out:json][timeout:25];
        area(${areaId});
        (
          node["amenity"="vending_machine"]["vending"~"cigarettes"](area);
        );
        out center;
      `;

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ data: query }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch OSM data');
      }

      const data = (await response.json()) as {
        version: number;
        generator: string;
        osm3s: {
          timestamp_osm_base: string;
          copyright: string;
        };
        elements: {
          type: 'node';
          id: number;
          lat: number;
          lon: number;
          tags?: Record<string, string>;
        }[];
      };

      return data;
    };

    const cvms = await fetchOsmAreaId(job.data.region)
      .then((areaId) => fetchOsmData(areaId))
      .then((data) => {
        const cvms = data.elements.map((element) => ({
          longitude: element.lon,
          latitude: element.lat,
        }));

        return cvms;
      });

    const command = new ImportCvmsCommand(cvms);
    await this.commandBus.execute<ImportCvmsCommand>(command);

    await job.log(`Imported ${cvms.length} CVMs from OSM`);
  }

  async importManual(
    job: Job<
      { cvms: { longitude: number; latitude: number; score: number }[] },
      void,
      string
    >,
  ): Promise<void> {
    this.logger.debug(
      `Importing CVM data from manual provided records...`,
      'CvmImportConsumer',
    );

    const command = new ImportCvmsCommand(job.data.cvms);
    await this.commandBus.execute<ImportCvmsCommand>(command);

    await job.log(`Imported ${job.data.cvms.length} CVMs from manual records`);
  }

  @OnWorkerEvent('active')
  async onActive(job: Job): Promise<void> {
    await this.jobHistoryService.upsertJobRunLog({ job, status: 'running' });
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job, result: any): Promise<void> {
    await this.jobHistoryService.upsertJobRunLog({
      job,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      result,
      status: 'completed',
    });
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job, error: Error): Promise<void> {
    this.logger.error(error.message, error.stack, 'CvmImportConsumer');
    await job.log(error.name + ': ' + error.message + '\n' + error.stack);
    await this.jobHistoryService.upsertJobRunLog({
      job,
      error,
      status: 'failed',
    });
  }
}
