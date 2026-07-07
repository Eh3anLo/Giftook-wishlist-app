import { describe, it, expect } from 'vitest'
import { handleServiceError } from '@/lib/api-helpers.js'
import {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from '@/lib/errors.js'

describe('handleServiceError', () => {
  it('maps ValidationError to 400 with error and field in body', async () => {
    const response = handleServiceError(new ValidationError('عنوان الزامی است.', 'title'))
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body).toEqual({ error: 'عنوان الزامی است.', field: 'title' })
  })

  it('maps UnauthorizedError to 401 with Persian message', async () => {
    const response = handleServiceError(new UnauthorizedError())
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body).toEqual({ error: 'برای ادامه باید وارد شوید.' })
  })

  it('maps ForbiddenError to 403 with Persian message', async () => {
    const response = handleServiceError(new ForbiddenError())
    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body).toEqual({ error: 'دسترسی غیرمجاز.' })
  })

  it('maps NotFoundError to 404 with Persian message', async () => {
    const response = handleServiceError(new NotFoundError())
    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body).toEqual({ error: 'مورد درخواستی یافت نشد.' })
  })

  it('maps ConflictError to 409 with the provided message', async () => {
    const response = handleServiceError(new ConflictError('این هدیه قبلاً رزرو شده است.'))
    expect(response.status).toBe(409)
    const body = await response.json()
    expect(body).toEqual({ error: 'این هدیه قبلاً رزرو شده است.' })
  })

  it('maps unknown errors to 500 with generic Persian message', async () => {
    const response = handleServiceError(new Error('unexpected'))
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body).toEqual({ error: 'خطای داخلی سرور.' })
  })
})
