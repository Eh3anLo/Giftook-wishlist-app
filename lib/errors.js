/**
 * Custom error classes for the GiftWish service layer.
 * These are thrown by services and caught by API route handlers,
 * which map them to the appropriate HTTP responses.
 */

export class ValidationError extends Error {
  constructor(message, field) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super('دسترسی غیرمجاز.')
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends Error {
  constructor() {
    super('مورد درخواستی یافت نشد.')
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ConflictError'
  }
}

export class UnauthorizedError extends Error {
  constructor() {
    super('برای ادامه باید وارد شوید.')
    this.name = 'UnauthorizedError'
  }
}
