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
} from '../events';
import { constants } from 'src/lib';

export class CvmId extends UUID {}

@Aggregate({ streamName: 'cvm' })
export class CvmAggregate extends AggregateRoot {
  private _id: CvmId;
  private _longitude: number;
  private _latitude: number;
  private _score: number;

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

  public upvote(identity: string, credibility: number) {
    if (this._score >= constants.MAX_CVM_SCORE) {
      return;
    }

    this.applyEvent(new CvmUpvotedEvent(this.id.value, identity, credibility));
  }

  public downvote(identity: string, credibility: number) {
    if (this._score <= constants.MIN_CVM_SCORE) {
      return;
    }

    this.applyEvent(
      new CvmDownvotedEvent(this.id.value, identity, credibility),
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

    this.applyEvent(
      new CvmSynchronizedEvent(
        this.id.value,
        { longitude: data.longitude, latitude: data.latitude },
        data.score,
      ),
    );
  }

  public static register(
    longitude: number,
    latitude: number,
    initialScore?: number,
    identity?: string,
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
      new CvmRegisteredEvent(
        CvmId.generate().value,
        { longitude, latitude },
        initialScore,
        identity,
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
    this._score = event.initialScore || 0;
  }

  @EventHandler(CvmImportedEvent)
  onCvmImported(event: CvmImportedEvent): void {
    this._id = CvmId.from(event.cvmId);
    this._longitude = event.position.longitude;
    this._latitude = event.position.latitude;
    this._score = event.initialScore || 0;
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
    this._score += event.credibility;
  }

  @EventHandler(CvmDownvotedEvent)
  onCvmDownvotedEvent(event: CvmDownvotedEvent): void {
    this._score -= event.credibility;
  }
}
