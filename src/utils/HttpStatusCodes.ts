export const Continue = 100;
export const OK = 200;
export const Created = 201;
export const Accepted = 202;
export const NoContent = 204;

export const BadRequest = 400;
export const Unauthorized = 401;
export const Forbidden = 403;
export const NotFound = 404;
export const Conflict = 409;
export const UnprocessableEntity = 422;
export const TooManyRequests = 429;

export const InternalServerError = 500;
export const BadGateway = 502;
export const ServiceUnavailable = 503;

// Grouped statues optional
export const Status = {
  Continue,
  OK,
  Created,
  Accepted,
  NoContent,

  BadRequest,
  Unauthorized,
  Forbidden,
  NotFound,
  Conflict,
  UnprocessableEntity,
  TooManyRequests,

  InternalServerError,
  BadGateway,
  ServiceUnavailable,
} as const;

export type StatusType = (typeof Status)[keyof typeof Status];

export default Status;
