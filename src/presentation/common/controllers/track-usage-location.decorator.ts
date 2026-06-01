import { Reflector } from '@nestjs/core';
import { Request } from 'express';

export type LocationExtractor = (
  req: Request,
) => { lng: number; lat: number } | null;

export const TrackUsageLocation =
  Reflector.createDecorator<LocationExtractor>();
