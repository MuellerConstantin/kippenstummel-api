import {
  Aggregate,
  AggregateRoot,
  EventHandler,
  UUID,
} from '@ocoda/event-sourcing';
import { CvmRegisteredEvent } from '../events';

export class CvmId extends UUID {}

@Aggregate({ streamName: 'cvm' })
export class CvmAggregate extends AggregateRoot {
  private _id: CvmId;
  private _longitude: number;
  private _latitude: number;

  public get id(): CvmId {
    return this._id;
  }

  public get longitude(): number {
    return this._longitude;
  }

  public get latitude(): number {
    return this._latitude;
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

  public static register(longitude: number, latitude: number): CvmAggregate {
    const aggregate = new CvmAggregate();

    aggregate.applyEvent(
      new CvmRegisteredEvent(CvmId.generate().value, { longitude, latitude }),
    );

    return aggregate;
  }

  @EventHandler(CvmRegisteredEvent)
  onCvmRegistered(event: CvmRegisteredEvent): void {
    this._id = CvmId.from(event.cvmId);
    this._longitude = event.position.longitude;
    this._latitude = event.position.latitude;
  }
}
