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
} from '../events';

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

  public upvote(): void {
    this.applyEvent(new CvmUpvotedEvent(this.id.value));
  }

  public downvote(): void {
    this.applyEvent(new CvmDownvotedEvent(this.id.value));
  }

  public synchronize(longitude: number, latitude: number, score: number): void {
    this.applyEvent(
      new CvmSynchronizedEvent(this.id.value, { longitude, latitude }, score),
    );
  }

  public static register(longitude: number, latitude: number): CvmAggregate {
    const aggregate = new CvmAggregate();

    aggregate.applyEvent(
      new CvmRegisteredEvent(
        CvmId.generate().value,
        { longitude, latitude },
        0,
      ),
    );

    return aggregate;
  }

  @EventHandler(CvmRegisteredEvent)
  onCvmRegistered(event: CvmRegisteredEvent): void {
    this._id = CvmId.from(event.cvmId);
    this._longitude = event.position.longitude;
    this._latitude = event.position.latitude;
    this._score = event.score;
  }

  @EventHandler(CvmSynchronizedEvent)
  onCvmSynchronized(event: CvmSynchronizedEvent): void {
    this._longitude = event.position.longitude;
    this._latitude = event.position.latitude;
    this._score = event.score;
  }

  @EventHandler(CvmUpvotedEvent)
  onLegatimacyConfirmed(event: CvmUpvotedEvent): void {
    if (this._score < 5) {
      this._score += 1;
    }
  }

  @EventHandler(CvmDownvotedEvent)
  onLegatimacyDoubted(event: CvmDownvotedEvent): void {
    if (this._score > -5) {
      this._score -= 1;
    }
  }
}
