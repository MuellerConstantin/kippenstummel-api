export enum ApiErrorCode {
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  INVALID_PAYLOAD_ERROR = 'INVALID_PAYLOAD_ERROR',
  MALFORMED_POW_STAMP_ERROR = 'MALFORMED_POW_STAMP_ERROR',
  INVALID_POW_STAMP_ERROR = 'INVALID_POW_STAMP_ERROR',
  MALFORMED_CAPTCHA_STAMP_ERROR = 'MALFORMED_CAPTCHA_STAMP_ERROR',
  INVALID_CAPTCHA_STAMP_ERROR = 'INVALID_CAPTCHA_STAMP_ERROR',
  ACCESS_DENIED_ERROR = 'ACCESS_DENIED_ERROR',
  INVALID_IDENT_TOKEN_ERROR = 'INVALID_IDENT_TOKEN_ERROR',
}

export const ApiErrorMessages: Record<ApiErrorCode, string> = {
  [ApiErrorCode.INTERNAL_ERROR]: 'Internal error occured',
  [ApiErrorCode.NOT_FOUND_ERROR]: 'Resource not found',
  [ApiErrorCode.INVALID_PAYLOAD_ERROR]: 'Payload validation failed',
  [ApiErrorCode.MALFORMED_POW_STAMP_ERROR]: 'Malformed PoW stamp',
  [ApiErrorCode.INVALID_POW_STAMP_ERROR]: 'Invalid PoW stamp',
  [ApiErrorCode.MALFORMED_CAPTCHA_STAMP_ERROR]: 'Malformed Captcha stamp',
  [ApiErrorCode.INVALID_CAPTCHA_STAMP_ERROR]: 'Invalid Captcha stamp',
  [ApiErrorCode.ACCESS_DENIED_ERROR]: 'Access denied',
  [ApiErrorCode.INVALID_IDENT_TOKEN_ERROR]: 'Invalid ident token',
};

export const ApiErrorStatuses: Record<ApiErrorCode, number> = {
  [ApiErrorCode.INTERNAL_ERROR]: 500,
  [ApiErrorCode.NOT_FOUND_ERROR]: 404,
  [ApiErrorCode.INVALID_PAYLOAD_ERROR]: 422,
  [ApiErrorCode.MALFORMED_POW_STAMP_ERROR]: 403,
  [ApiErrorCode.INVALID_POW_STAMP_ERROR]: 403,
  [ApiErrorCode.MALFORMED_CAPTCHA_STAMP_ERROR]: 403,
  [ApiErrorCode.INVALID_CAPTCHA_STAMP_ERROR]: 403,
  [ApiErrorCode.ACCESS_DENIED_ERROR]: 403,
  [ApiErrorCode.INVALID_IDENT_TOKEN_ERROR]: 401,
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

export class MalformedPoWStampError extends ApiError {
  constructor(cause?: any) {
    super(ApiErrorCode.MALFORMED_POW_STAMP_ERROR, undefined, cause);
  }
}

export class InvalidPoWStampError extends ApiError {
  constructor(cause?: any) {
    super(ApiErrorCode.INVALID_POW_STAMP_ERROR, undefined, cause);
  }
}

export class AccessDeniedError extends ApiError {
  constructor(cause?: any) {
    super(ApiErrorCode.ACCESS_DENIED_ERROR, undefined, cause);
  }
}

export class InvalidIdentTokenError extends ApiError {
  constructor(cause?: any) {
    super(ApiErrorCode.INVALID_IDENT_TOKEN_ERROR, undefined, cause);
  }
}

export class MalformedCaptchaStampError extends ApiError {
  constructor(cause?: any) {
    super(ApiErrorCode.MALFORMED_CAPTCHA_STAMP_ERROR, undefined, cause);
  }
}

export class InvalidCaptchaStampError extends ApiError {
  constructor(cause?: any) {
    super(ApiErrorCode.INVALID_CAPTCHA_STAMP_ERROR, undefined, cause);
  }
}
