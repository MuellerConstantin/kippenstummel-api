import * as winston from 'winston';
import { getRequestContext } from './request-context';

/*
 * Enriches every log record emitted while handling an HTTP request with the
 * request's correlation id, so that arbitrary log statements from within the
 * request lifecycle can be tied back to the request that caused them.
 */
export const requestIdFormat = winston.format((info) => {
  const context = getRequestContext();

  if (context) {
    info.requestId = context.requestId;
  }

  return info;
});
