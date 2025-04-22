import {
  type ISnapshot,
  Snapshot,
  SnapshotRepository,
} from '@ocoda/event-sourcing';
import { CvmAggregate, CvmId } from '../models';

@Snapshot(CvmAggregate, { name: 'cvm', interval: 5 })
export class CvmSnapshotRepository extends SnapshotRepository<CvmAggregate> {
  serialize({
    id,
    longitude,
    latitude,
    score,
  }: CvmAggregate): ISnapshot<CvmAggregate> {
    return {
      id: id.value,
      longitude,
      latitude,
      score,
    };
  }

  deserialize({
    id,
    longitude,
    latitude,
    score,
  }: ISnapshot<CvmAggregate>): CvmAggregate {
    const aggregate = new CvmAggregate();

    aggregate.id = CvmId.from(id);
    aggregate.longitude = longitude;
    aggregate.latitude = latitude;
    aggregate.score = score;

    return aggregate;
  }
}
