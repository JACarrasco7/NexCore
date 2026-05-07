export class AuthError extends Error {
  status = 401;
  code = "UNAUTHORIZED";
  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthError";
  }
}

export class ForbiddenError extends Error {
  status = 403;
  code = "FORBIDDEN";
  constructor(message = "Access denied") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class ValidationError extends Error {
  status = 400;
  code = "VALIDATION_ERROR";
  details?: unknown;
  constructor(message = "Invalid input", details?: unknown) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
  }
}

export class NotFoundError extends Error {
  status = 404;
  code = "NOT_FOUND";
  constructor(message = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}
