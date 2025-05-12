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
  static readonly MIN_SCORE = -5;
  static readonly MAX_SCORE = 5;
  static readonly MAX_LATEST_VOTES = 10;

  private _id: CvmId;
  private _longitude: number;
  private _latitude: number;
  private _score: number;
  private _latestVotes: { identity: string; type: 'upvote' | 'downvote' }[] =
    [];

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

  public get latestVotes(): {
    identity: string;
    type: 'upvote' | 'downvote';
  }[] {
    return this._latestVotes;
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

  public set latestVotes(
    latestVotes: { identity: string; type: 'upvote' | 'downvote' }[],
  ) {
    if (latestVotes.length > CvmAggregate.MAX_LATEST_VOTES) {
      latestVotes = latestVotes.slice(-CvmAggregate.MAX_LATEST_VOTES);
    }

    this._latestVotes = latestVotes;
  }

  public upvote(identity: string): boolean {
    if (this._score >= CvmAggregate.MAX_SCORE) {
      return false;
    }

    const alreadyVoted = this._latestVotes
      .filter((vote) => vote.type === 'upvote')
      .some((vote) => {
        return vote.identity === identity;
      });

    if (alreadyVoted) {
      return false;
    }

    this.applyEvent(new CvmUpvotedEvent(this.id.value, identity));

    return true;
  }

  public downvote(identity: string): boolean {
    if (this._score <= CvmAggregate.MIN_SCORE) {
      return false;
    }

    const alreadyVoted = this._latestVotes.some((vote) => {
      return vote.identity === identity && vote.type === 'downvote';
    });

    if (alreadyVoted) {
      return false;
    }

    this.applyEvent(new CvmDownvotedEvent(this.id.value, identity));

    return true;
  }

  public synchronize(data: {
    longitude?: number;
    latitude?: number;
    score?: number;
  }): void {
    if (
      data.score &&
      (data.score < CvmAggregate.MIN_SCORE ||
        data.score > CvmAggregate.MAX_SCORE)
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
      (initialScore < CvmAggregate.MIN_SCORE ||
        initialScore > CvmAggregate.MAX_SCORE)
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

  @EventHandler(CvmRegisteredEvent)
  onCvmRegistered(event: CvmRegisteredEvent): void {
    this._id = CvmId.from(event.cvmId);
    this._longitude = event.position.longitude;
    this._latitude = event.position.latitude;
    this._score = event.initialScore || 0;

    if (event.identity) {
      this._latestVotes = [];
      this._latestVotes.push({
        identity: event.identity,
        type: 'upvote',
      });
    }
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
    if (this._latestVotes.length >= CvmAggregate.MAX_LATEST_VOTES) {
      this._latestVotes.shift();
    }

    this._latestVotes.push({ identity: event.identity, type: 'upvote' });
    this._score += 1;
  }

  @EventHandler(CvmDownvotedEvent)
  onCvmDownvotedEvent(event: CvmDownvotedEvent): void {
    if (this._latestVotes.length >= CvmAggregate.MAX_LATEST_VOTES) {
      this._latestVotes.shift();
    }

    this._latestVotes.push({
      identity: event.identity,
      type: 'downvote',
    });
    this._score -= 1;
  }
}
