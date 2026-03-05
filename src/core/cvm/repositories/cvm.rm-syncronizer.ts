import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cvm, Repositioning, Vote, Report } from './schemas';
import { Model } from 'mongoose';
import { InconsistentReadModelError } from 'src/lib/models';

@Injectable()
export class CvmReadModelSynchronizer {
  constructor(
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
    @InjectModel(Vote.name) private readonly voteModel: Model<Vote>,
    @InjectModel(Repositioning.name)
    private readonly repositioningModel: Model<Repositioning>,
    @InjectModel(Report.name) private readonly reportModel: Model<Report>,
  ) {}

  async applyDownvote(
    cvmId: string,
    voterIdentity: string | null,
    scoreChange: number,
  ): Promise<void> {
    const result = await this.cvmModel
      .findOneAndUpdate(
        { aggregateId: cvmId },
        {
          $inc: { score: -scoreChange },
        },
        { new: true },
      )
      .exec();

    if (!result) {
      throw new InconsistentReadModelError();
    }

    await this.voteModel.create({
      identity: voterIdentity,
      cvm: result._id,
      impact: scoreChange,
      type: 'downvote',
    });
  }

  async applyReposition(
    cvmId: string,
    editorIdentity: string | null,
    longitude: number,
    latitude: number,
  ): Promise<void> {
    const result = await this.cvmModel
      .findOneAndUpdate(
        {
          aggregateId: cvmId,
        },
        {
          $set: {
            position: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
          },
        },
        { new: true },
      )
      .exec();

    if (!result) {
      throw new InconsistentReadModelError();
    }

    await this.repositioningModel.create({
      identity: editorIdentity,
      cvm: result._id,
      position: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
    });
  }

  async applyImport(
    cvmId: string,
    longitude: number,
    latitude: number,
    initialScore?: number,
  ): Promise<void> {
    await this.cvmModel.create({
      aggregateId: cvmId,
      position: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      score: initialScore ?? 0,
      imported: true,
      markedForDeletion: false,
      markedForDeletionAt: null,
    });
  }

  async applyRegister(
    cvmId: string,
    longitude: number,
    latitude: number,
    creatorIdentity: string | null,
  ): Promise<void> {
    await this.cvmModel.create({
      aggregateId: cvmId,
      position: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      score: 0,
      imported: false,
      markedForDeletion: false,
      markedForDeletionAt: null,
      registeredBy: creatorIdentity,
    });
  }

  async applyRemove(cvmId: string): Promise<void> {
    const documentId = (
      await this.cvmModel.findOne({
        aggregateId: cvmId,
      })
    )?._id;

    await this.voteModel.deleteMany({ cvm: documentId });

    await this.reportModel.deleteMany({ cvm: documentId });

    await this.repositioningModel.deleteMany({ cvm: documentId });

    await this.cvmModel.deleteOne({
      aggregateId: cvmId,
    });
  }

  async applyReport(
    cvmId: string,
    reporterIdentity: string | null,
    type: string,
  ): Promise<void> {
    const result = await this.cvmModel
      .findOne({
        aggregateId: cvmId,
      })
      .exec();

    if (!result) {
      throw new InconsistentReadModelError();
    }

    await this.reportModel.create({
      identity: reporterIdentity,
      cvm: result._id,
      type,
    });
  }

  async applyRestore(
    cvmId: string,
    longitude: number,
    latitude: number,
  ): Promise<void> {
    await this.cvmModel.create({
      aggregateId: cvmId,
      position: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      score: 0,
      imported: false,
      markedForDeletion: false,
      markedForDeletionAt: null,
      registeredBy: null,
    });
  }

  async applySync(
    cvmId: string,
    longitude: number,
    latitude: number,
    forcedScore?: number,
  ): Promise<void> {
    const result = await this.cvmModel.findOneAndUpdate(
      { aggregateId: cvmId },
      {
        $set: {
          score: forcedScore,
          position: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
        },
      },
      { new: true },
    );

    if (!result) {
      throw new InconsistentReadModelError();
    }
  }

  async applyUpvote(
    cvmId: string,
    voterIdentity: string | null,
    scoreChange: number,
  ): Promise<void> {
    const result = await this.cvmModel
      .findOneAndUpdate(
        { aggregateId: cvmId },
        {
          $inc: { score: scoreChange },
        },
        { new: true },
      )
      .exec();

    if (!result) {
      throw new InconsistentReadModelError();
    }

    await this.voteModel.create({
      identity: voterIdentity,
      cvm: result._id,
      impact: scoreChange,
      type: 'upvote',
    });
  }

  async applyCreatorRemove(identity: string): Promise<void> {
    await this.cvmModel.updateMany(
      { registeredBy: identity },
      { $unset: { registeredBy: '' } },
    );

    await this.voteModel.updateMany({ identity }, { $unset: { identity: '' } });

    await this.repositioningModel.updateMany(
      { identity },
      { $unset: { identity: '' } },
    );

    await this.reportModel.updateMany(
      { identity: identity },
      { $unset: { identity: '' } },
    );
  }

  async applyDeletionMark(cvmId: string, deletedAt: Date): Promise<void> {
    const result = await this.cvmModel
      .findOneAndUpdate(
        { aggregateId: cvmId },
        {
          $set: {
            markedForDeletion: true,
            markedForDeletionAt: deletedAt,
          },
        },
        { new: true },
      )
      .exec();

    if (!result) {
      throw new InconsistentReadModelError();
    }
  }

  async applyDeletionUnmark(cvmId: string): Promise<void> {
    const result = await this.cvmModel
      .findOneAndUpdate(
        { aggregateId: cvmId },
        {
          $set: {
            markedForDeletion: false,
            markedForDeletionAt: null,
          },
        },
        { new: true },
      )
      .exec();

    if (!result) {
      throw new InconsistentReadModelError();
    }
  }
}
