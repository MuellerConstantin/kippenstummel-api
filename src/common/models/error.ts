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
  UNAUTHENTICATED_ERROR = 'UNAUTHENTICATED_ERROR',
  OUT_OF_REACH_ERROR = 'OUT_OF_REACH_ERROR',
  UNKNOWN_IDENTITY_ERROR = 'UNKNOWN_IDENTITY_ERROR',
  INVALID_IMPORT_FILE_ERROR = 'INVALID_IMPORT_FILE_ERROR',
  INVALID_FILTER_QUERY_ERROR = 'INVALID_FILTER_QUERY_ERROR',
  UNSUPPORTED_FILTER_FIELD_ERROR = 'UNSUPPORTED_FILTER_FIELD_ERROR',
  ALTERATION_CONFLICT_ERROR = 'ALTERATION_CONFLICT_ERROR',
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
  [ApiErrorCode.UNAUTHENTICATED_ERROR]: 'Unauthenticated request',
  [ApiErrorCode.OUT_OF_REACH_ERROR]: 'Out of reach',
  [ApiErrorCode.UNKNOWN_IDENTITY_ERROR]: 'Unknown identity',
  [ApiErrorCode.INVALID_IMPORT_FILE_ERROR]: 'Invalid import file',
  [ApiErrorCode.INVALID_FILTER_QUERY_ERROR]: 'Invalid filter query',
  [ApiErrorCode.UNSUPPORTED_FILTER_FIELD_ERROR]: 'Unsupported filter field',
  [ApiErrorCode.ALTERATION_CONFLICT_ERROR]: 'Alteration conflict',
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
  [ApiErrorCode.UNAUTHENTICATED_ERROR]: 401,
  [ApiErrorCode.OUT_OF_REACH_ERROR]: 403,
  [ApiErrorCode.UNKNOWN_IDENTITY_ERROR]: 401,
  [ApiErrorCode.INVALID_IMPORT_FILE_ERROR]: 400,
  [ApiErrorCode.INVALID_FILTER_QUERY_ERROR]: 400,
  [ApiErrorCode.UNSUPPORTED_FILTER_FIELD_ERROR]: 400,
  [ApiErrorCode.ALTERATION_CONFLICT_ERROR]: 409,
};

export abstract class ApiError extends Error {
  private readonly _status: number;
  private readonly _code: ApiErrorCode;
  private readonly _timestamp: Date;
  private readonly _details?: { [key: string]: any }[];
  private readonly _cause?: Error;

  constructor(
    code: ApiErrorCode,
    details?: { [key: string]: any }[],
    cause?: Error,
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
  constructor(cause?: Error) {
    super(ApiErrorCode.INTERNAL_ERROR, undefined, cause);
  }
}

export class NotFoundError extends ApiError {
  constructor(cause?: Error) {
    super(ApiErrorCode.NOT_FOUND_ERROR, undefined, cause);
  }
}

export class InvalidPayloadError extends ApiError {
  constructor(details?: { [key: string]: any }[], cause?: Error) {
    super(ApiErrorCode.INVALID_PAYLOAD_ERROR, details, cause);
  }
}

export class MalformedPoWStampError extends ApiError {
  constructor(cause?: Error) {
    super(ApiErrorCode.MALFORMED_POW_STAMP_ERROR, undefined, cause);
  }
}

export class InvalidPoWStampError extends ApiError {
  constructor(cause?: Error) {
    super(ApiErrorCode.INVALID_POW_STAMP_ERROR, undefined, cause);
  }
}

export class AccessDeniedError extends ApiError {
  constructor(cause?: Error) {
    super(ApiErrorCode.ACCESS_DENIED_ERROR, undefined, cause);
  }
}

export class InvalidIdentTokenError extends ApiError {
  constructor(cause?: Error) {
    super(ApiErrorCode.INVALID_IDENT_TOKEN_ERROR, undefined, cause);
  }
}

export class MalformedCaptchaStampError extends ApiError {
  constructor(cause?: Error) {
    super(ApiErrorCode.MALFORMED_CAPTCHA_STAMP_ERROR, undefined, cause);
  }
}

export class InvalidCaptchaStampError extends ApiError {
  constructor(cause?: Error) {
    super(ApiErrorCode.INVALID_CAPTCHA_STAMP_ERROR, undefined, cause);
  }
}

export class UnauthenticatedError extends ApiError {
  constructor(cause?: Error) {
    super(ApiErrorCode.UNAUTHENTICATED_ERROR, undefined, cause);
  }
}

export class OutOfReachError extends ApiError {
  constructor(cause?: Error) {
    super(ApiErrorCode.OUT_OF_REACH_ERROR, undefined, cause);
  }
}

export class UnknownIdentityError extends ApiError {
  constructor(cause?: Error) {
    super(ApiErrorCode.UNKNOWN_IDENTITY_ERROR, undefined, cause);
  }
}

export class InvalidImportFileError extends ApiError {
  constructor(cause?: Error) {
    super(ApiErrorCode.INVALID_IMPORT_FILE_ERROR, undefined, cause);
  }
}

export class InvalidFilterQueryError extends ApiError {
  constructor(cause?: Error) {
    super(ApiErrorCode.INVALID_FILTER_QUERY_ERROR, undefined, cause);
  }
}

export class UnsupportedFilterFieldError extends ApiError {
  constructor(details?: { [key: string]: any }[], cause?: Error) {
    super(ApiErrorCode.UNSUPPORTED_FILTER_FIELD_ERROR, details, cause);
  }
}

export class AlterationConflictError extends ApiError {
  constructor(cause?: Error) {
    super(ApiErrorCode.ALTERATION_CONFLICT_ERROR, undefined, cause);
  }
}
