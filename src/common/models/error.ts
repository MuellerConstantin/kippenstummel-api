export enum ApiErrorCode {
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  INVALID_PAYLOAD_ERROR = 'INVALID_PAYLOAD_ERROR',
}

export const ApiErrorMessages: Record<ApiErrorCode, string> = {
  [ApiErrorCode.INTERNAL_ERROR]: 'Internal error occured',
  [ApiErrorCode.NOT_FOUND_ERROR]: 'Resource not found',
  [ApiErrorCode.INVALID_PAYLOAD_ERROR]: 'Payload validation failed',
};

export const ApiErrorStatuses: Record<ApiErrorCode, number> = {
  [ApiErrorCode.INTERNAL_ERROR]: 500,
  [ApiErrorCode.NOT_FOUND_ERROR]: 404,
  [ApiErrorCode.INVALID_PAYLOAD_ERROR]: 422,
};

export abstract class ApiError extends Error {
  private readonly _status: number;
  private readonly _code: ApiErrorCode;
  private readonly _timestamp: Date;
  private readonly _details?: { [key: string]: any }[];
  private readonly _cause?: any;

  constructor(
    code: ApiErrorCode,
    details?: { [key: string]: any }[],
    cause?: any,
  ) {
    super(ApiErrorMessages[code]);

    this._status = ApiErrorStatuses[code];
    this._code = code;
    this._timestamp = new Date();
    this._details = details;
    this._cause = cause;
  }

  get status(): number {
    return this._status;
  }

  get code(): ApiErrorCode {
    return this._code;
  }

  get timestamp(): Date {
    return this._timestamp;
  }

  get details(): { [key: string]: any }[] | undefined {
    return this._details;
  }

  get cause(): Error | undefined {
    return this._cause;
  }
}

export class InternalError extends ApiError {
  constructor(cause?: any) {
    super(ApiErrorCode.INTERNAL_ERROR, undefined, cause);
  }
}

export class NotFoundError extends ApiError {
  constructor(cause?: any) {
    super(ApiErrorCode.NOT_FOUND_ERROR, undefined, cause);
  }
}

export class InvalidPayloadError extends ApiError {
  constructor(details?: { [key: string]: any }[], cause?: any) {
    super(ApiErrorCode.INVALID_PAYLOAD_ERROR, details, cause);
  }
}
