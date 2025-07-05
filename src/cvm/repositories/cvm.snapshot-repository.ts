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
    imported,
    recentReports,
  }: CvmAggregate): ISnapshot<CvmAggregate> {
    return {
      id: id.value,
      longitude,
      latitude,
      score,
      imported,
      recentReports,
    };
  }

  deserialize({
    id,
    longitude,
    latitude,
    score,
    imported,
    recentReports,
  }: ISnapshot<CvmAggregate>): CvmAggregate {
    const aggregate = new CvmAggregate();

    aggregate.id = CvmId.from(id as string);
    aggregate.longitude = longitude as number;
    aggregate.latitude = latitude as number;
    aggregate.score = score as number;
    aggregate.imported = imported as boolean;
    aggregate.recentReports = recentReports as [];

    return aggregate;
  }
}
