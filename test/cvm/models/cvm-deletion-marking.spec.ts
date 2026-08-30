import {
  CvmDeletionMarkedEvent,
  CvmDeletionUnmarkedEvent,
} from 'src/core/cvm/events';
import { CvmAggregate, CvmId } from 'src/core/cvm/models';
import { constants } from 'src/lib';

const THRESHOLD = constants.MARKED_FOR_DELETION_THRESHOLD;
const VOTER = '20718133-9c8d-45bb-b3e5-6462827e77ae';

const cvmAt = (score: number, markedForDeletion = false): CvmAggregate => {
  const aggregate = new CvmAggregate();

  aggregate.id = CvmId.from('8eadee97-4ba8-47ee-a24b-246166a55966');
  aggregate.imported = false;
  aggregate.score = score;
  aggregate.version = 0;
  aggregate.recentReports = [];
  aggregate.latitude = 49.0092;
  aggregate.longitude = 8.40395;
  aggregate.markedForDeletion = markedForDeletion;
  aggregate.markedForDeletionAt = markedForDeletion ? new Date() : undefined;

  return aggregate;
};

const countOf = (
  aggregate: CvmAggregate,
  type: new (...args: never[]) => object,
): number => aggregate.commit().filter((event) => event instanceof type).length;

describe('CVM deletion marking', () => {
  it('marks a CVM once its score reaches the threshold', () => {
    const aggregate = cvmAt(THRESHOLD + 1);

    aggregate.downvote(VOTER);

    expect(aggregate.score).toBe(THRESHOLD);
    expect(aggregate.markedForDeletion).toBe(true);
    expect(aggregate.markedForDeletionAt).toBeInstanceOf(Date);
    expect(countOf(aggregate, CvmDeletionMarkedEvent)).toBe(1);
  });

  it('leaves a CVM unmarked while its score stays above the threshold', () => {
    const aggregate = cvmAt(THRESHOLD + 2);

    aggregate.downvote(VOTER);

    expect(aggregate.score).toBe(THRESHOLD + 1);
    expect(aggregate.markedForDeletion).toBe(false);
    expect(countOf(aggregate, CvmDeletionMarkedEvent)).toBe(0);
  });

  it('does not mark a CVM that is already marked', () => {
    const aggregate = cvmAt(THRESHOLD, true);

    aggregate.downvote(VOTER);

    expect(aggregate.score).toBe(THRESHOLD - 1);
    expect(countOf(aggregate, CvmDeletionMarkedEvent)).toBe(0);
  });

  it('unmarks a CVM voted back above the threshold', () => {
    const aggregate = cvmAt(THRESHOLD, true);

    aggregate.upvote(VOTER);

    expect(aggregate.score).toBe(THRESHOLD + 1);
    expect(aggregate.markedForDeletion).toBe(false);
    expect(aggregate.markedForDeletionAt).toBeUndefined();
    expect(countOf(aggregate, CvmDeletionUnmarkedEvent)).toBe(1);
  });

  it('marks a CVM whose forced score is synchronized past the threshold', () => {
    const aggregate = cvmAt(0);

    aggregate.synchronize({ score: THRESHOLD - 1, source: 'osm' });

    expect(aggregate.score).toBe(THRESHOLD - 1);
    expect(aggregate.markedForDeletion).toBe(true);
    expect(countOf(aggregate, CvmDeletionMarkedEvent)).toBe(1);
  });

  /*
   * At the floor the downvote returns before applying anything, so the marking is not
   * re-evaluated either — the CVM stays marked from when it crossed the threshold.
   */

  it('emits nothing when a CVM at the score floor is downvoted', () => {
    const aggregate = cvmAt(constants.MIN_CVM_SCORE, true);

    aggregate.downvote(VOTER);

    expect(aggregate.score).toBe(constants.MIN_CVM_SCORE);
    expect(aggregate.markedForDeletion).toBe(true);
    expect(aggregate.commit()).toHaveLength(0);
  });
});
