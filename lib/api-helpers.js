import {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
} from '@/lib/errors.js'

/**
 * Maps service-layer error types to the appropriate Next.js Response.json() call.
 * Use this in API route handler catch blocks to convert thrown errors into HTTP responses.
 *
 * @param {Error} error - The error thrown by a service function.
 * @returns {Response}
 */
export function handleServiceError(error) {
  if (error instanceof ValidationError) {
    return Response.json({ error: error.message, field: error.field }, { status: 400 })
  }

  if (error instanceof UnauthorizedError) {
    return Response.json({ error: 'برای ادامه باید وارد شوید.' }, { status: 401 })
  }

  if (error instanceof ForbiddenError) {
    return Response.json({ error: 'دسترسی غیرمجاز.' }, { status: 403 })
  }

  if (error instanceof NotFoundError) {
    return Response.json({ error: 'مورد درخواستی یافت نشد.' }, { status: 404 })
  }

  if (error instanceof ConflictError) {
    return Response.json({ error: error.message }, { status: 409 })
  }

  if (error instanceof TooManyRequestsError) {
    return Response.json({ error: error.message }, { status: 429 })
  }

  // Unknown / unexpected errors
  return Response.json({ error: 'خطای داخلی سرور.' }, { status: 500 })
}