export enum ApiErrorCode {
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
}

export const ApiErrorMessages: Record<ApiErrorCode, string> = {
  [ApiErrorCode.INTERNAL_ERROR]: 'Internal error occured',
  [ApiErrorCode.NOT_FOUND_ERROR]: 'Resource not found',
};

export const ApiErrorStatuses: Record<ApiErrorCode, number> = {
  [ApiErrorCode.INTERNAL_ERROR]: 500,
  [ApiErrorCode.NOT_FOUND_ERROR]: 404,
};

export abstract class ApiError extends Error {
  private readonly _status: number;
  private readonly _code: ApiErrorCode;
  private readonly _timestamp: Date;
  private readonly _cause?: any;

  constructor(code: ApiErrorCode, cause?: any) {
    super(ApiErrorMessages[code]);

    this._status = ApiErrorStatuses[code];
    this._code = code;
    this._timestamp = new Date();
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

  get cause(): Error | undefined {
    return this._cause;
  }
}

export class InternalError extends ApiError {
  constructor(cause?: any) {
    super(ApiErrorCode.INTERNAL_ERROR, cause);
  }
}

export class NotFoundError extends ApiError {
  constructor(cause?: any) {
    super(ApiErrorCode.NOT_FOUND_ERROR, cause);
  }
}
