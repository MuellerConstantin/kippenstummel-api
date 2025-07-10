import {
  Aggregate,
  AggregateRoot,
  EventHandler,
  UUID,
} from '@ocoda/event-sourcing';
import {
  CvmRegisteredEvent,
  CvmUpvotedEvent,
  CvmDownvotedEvent,
  CvmSynchronizedEvent,
  CvmImportedEvent,
  CvmRepositionedEvent,
  CvmReportedEvent,
  CvmRestoredEvent,
  CvmRemovedEvent,
} from '../events';
import { constants } from 'src/lib';

export class CvmId extends UUID {}

export type ReportType = 'missing' | 'spam' | 'inactive' | 'inaccessible';

export type ReportEntry = {
  type: ReportType;
  timestamp: Date;
};

@Aggregate({ streamName: 'cvm' })
export class CvmAggregate extends AggregateRoot {
  private _id: CvmId;
  private _longitude: number;
  private _latitude: number;
  private _score: number;
  private _imported: boolean;
  private _recentReports: ReportEntry[] = [];
  private _removed: boolean = false;

  private readonly MAX_REPORTS_PER_TYPE = 10;

  public get id(): CvmId {
    return this._id;
  }

  public get longitude(): number {
    return this._longitude;
  }

  public get latitude(): number {
    return this._latitude;
  }

  public get score(): number {
    return this._score;
  }

  public get imported(): boolean {
    return this._imported;
  }

  public get recentReports(): ReportEntry[] {
    return this._recentReports;
  }

  public get removed(): boolean {
    return this._removed;
  }

  public set id(id: CvmId) {
    this._id = id;
  }

  public set longitude(longitude: number) {
    this._longitude = longitude;
  }

  public set latitude(latitude: number) {
    this._latitude = latitude;
  }

  public set score(score: number) {
    this._score = score;
  }

  public set imported(imported: boolean) {
    this._imported = imported;
  }

  public set recentReports(recentReports: ReportEntry[]) {
    this._recentReports = recentReports;
  }

  public set removed(removed: boolean) {
    this._removed = removed;
  }

  public upvote(
    voterIdentity: string,
    impact: number = constants.DEFAULT_CVM_VOTE_IMPACT,
  ) {
    if (this._removed) {
      throw new Error('CVM has been removed');
    }

    if (this._score >= constants.MAX_CVM_SCORE) {
      return;
    }

    this.applyEvent(new CvmUpvotedEvent(this.id.value, voterIdentity, impact));
  }

  public downvote(
    voterIdentity: string,
    impact: number = constants.DEFAULT_CVM_VOTE_IMPACT,
  ) {
    if (this._removed) {
      throw new Error('CVM has been removed');
    }

    if (this._score <= constants.MIN_CVM_SCORE) {
      return;
    }

    this.applyEvent(
      new CvmDownvotedEvent(this.id.value, voterIdentity, impact),
    );
  }

  public synchronize(data: {
    longitude?: number;
    latitude?: number;
    score?: number;
  }): void {
    if (
      data.score &&
      (data.score < constants.MIN_CVM_SCORE ||
        data.score > constants.MAX_CVM_SCORE)
    ) {
      throw new Error('Invalid forced score');
    }

    if (this._removed) {
      this.applyEvent(
        new CvmRestoredEvent(this.id.value, {
          longitude: data.longitude || this.longitude,
          latitude: data.latitude || this.latitude,
        }),
      );
      return;
    }

    this.applyEvent(
      new CvmSynchronizedEvent(
        this.id.value,
        { longitude: data.longitude, latitude: data.latitude },
        data.score,
      ),
    );
  }

  public reposition(
    editorIdentity: string,
    credibility: number,
    repositionedLongitude: number,
    repositionedLatitude: number,
  ) {
    if (this._removed) {
      throw new Error('CVM has been removed');
    }

    this.applyEvent(
      new CvmRepositionedEvent(
        this.id.value,
        editorIdentity,
        {
          longitude: this.longitude,
          latitude: this.latitude,
        },
        {
          longitude: repositionedLongitude,
          latitude: repositionedLatitude,
        },
      ),
    );
  }

  public report(reporterIdentity: string, type: ReportType) {
    if (this._removed) {
      throw new Error('CVM has been removed');
    }

    this.applyEvent(
      new CvmReportedEvent(this.id.value, reporterIdentity, type),
    );
  }

  public remove() {
    if (this._removed) {
      throw new Error('CVM has already been removed');
    }

    this.applyEvent(
      new CvmRemovedEvent(this.id.value, {
        longitude: this.longitude,
        latitude: this.latitude,
      }),
    );
  }

  public restore() {
    if (!this._removed) {
      throw new Error('CVM has not been removed');
    }

    this.applyEvent(
      new CvmRestoredEvent(this.id.value, {
        longitude: this.longitude,
        latitude: this.latitude,
      }),
    );
  }

  public static register(
    longitude: number,
    latitude: number,
    creatorIdentity: string,
  ): CvmAggregate {
    const aggregate = new CvmAggregate();

    aggregate.applyEvent(
      new CvmRegisteredEvent(
        CvmId.generate().value,
        { longitude, latitude },
        creatorIdentity,
      ),
    );

    return aggregate;
  }

  public static import(
    longitude: number,
    latitude: number,
    initialScore?: number,
  ): CvmAggregate {
    if (
      initialScore &&
      (initialScore < constants.MIN_CVM_SCORE ||
        initialScore > constants.MAX_CVM_SCORE)
    ) {
      throw new Error('Invalid initial score');
    }

    const aggregate = new CvmAggregate();

    aggregate.applyEvent(
      new CvmImportedEvent(
        CvmId.generate().value,
        { longitude, latitude },
        initialScore,
      ),
    );

    return aggregate;
  }

  @EventHandler(CvmRegisteredEvent)
  onCvmRegistered(event: CvmRegisteredEvent): void {
    this._id = CvmId.from(event.cvmId);
    this._longitude = event.position.longitude;
    this._latitude = event.position.latitude;
    this._score = 0;
    this._imported = false;
  }

  @EventHandler(CvmImportedEvent)
  onCvmImported(event: CvmImportedEvent): void {
    this._id = CvmId.from(event.cvmId);
    this._longitude = event.position.longitude;
    this._latitude = event.position.latitude;
    this._score = event.initialScore || 0;
    this._imported = true;
  }

  @EventHandler(CvmSynchronizedEvent)
  onCvmSynchronized(event: CvmSynchronizedEvent): void {
    if (event.position.longitude) {
      this._longitude = event.position.longitude;
    }

    if (event.position.latitude) {
      this._latitude = event.position.latitude;
    }

    if (event.forcedScore) {
      this._score = event.forcedScore;
    }
  }

  @EventHandler(CvmUpvotedEvent)
  onCvmUpvotedEvent(event: CvmUpvotedEvent): void {
    this._score += event.impact;

    if (this._score > constants.MAX_CVM_SCORE) {
      this._score = constants.MAX_CVM_SCORE;
    }
  }

  @EventHandler(CvmDownvotedEvent)
  onCvmDownvotedEvent(event: CvmDownvotedEvent): void {
    this._score -= event.impact;

    if (this._score < constants.MIN_CVM_SCORE) {
      this._score = constants.MIN_CVM_SCORE;
    }
  }

  @EventHandler(CvmRepositionedEvent)
  onCvmRepositionedEvent(event: CvmRepositionedEvent): void {
    this._longitude = event.repositionedPosition.longitude;
    this._latitude = event.repositionedPosition.latitude;
  }

  @EventHandler(CvmReportedEvent)
  onCvmReportedEvent(event: CvmReportedEvent): void {
    const entry: ReportEntry = {
      type: event.type,
      timestamp: event.timestamp,
    };

    const sameTypeReports = this._recentReports.filter(
      (report) => report.type === entry.type,
    );

    // Remove oldest report of the same type
    if (sameTypeReports.length >= this.MAX_REPORTS_PER_TYPE) {
      const indexToRemove = this._recentReports.findIndex(
        (report) => report.type === entry.type,
      );

      if (indexToRemove !== -1) {
        this._recentReports.splice(indexToRemove, 1);
      }
    }

    // Inerst the new report
    this._recentReports.push(entry);
  }

  @EventHandler(CvmRemovedEvent)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onCvmRemovedEvent(event: CvmRemovedEvent): void {
    this._removed = true;
  }

  @EventHandler(CvmRestoredEvent)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onCvmRestoredEvent(event: CvmRestoredEvent): void {
    this._removed = false;
  }
}
