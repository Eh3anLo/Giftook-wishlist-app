import { describe, it, expect } from 'vitest'
import {
  ValidationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
} from '@/lib/errors.js'

describe('ValidationError', () => {
  it('is an instance of Error', () => {
    expect(new ValidationError('bad input', 'title')).toBeInstanceOf(Error)
  })

  it('has name "ValidationError"', () => {
    expect(new ValidationError('msg', 'field').name).toBe('ValidationError')
  })

  it('stores message and field correctly', () => {
    const err = new ValidationError('عنوان الزامی است.', 'title')
    expect(err.message).toBe('عنوان الزامی است.')
    expect(err.field).toBe('title')
  })
})

describe('ForbiddenError', () => {
  it('is an instance of Error', () => {
    expect(new ForbiddenError()).toBeInstanceOf(Error)
  })

  it('has name "ForbiddenError"', () => {
    expect(new ForbiddenError().name).toBe('ForbiddenError')
  })

  it('has the correct default message', () => {
    expect(new ForbiddenError().message).toBe('دسترسی غیرمجاز.')
  })
})

describe('NotFoundError', () => {
  it('is an instance of Error', () => {
    expect(new NotFoundError()).toBeInstanceOf(Error)
  })

  it('has name "NotFoundError"', () => {
    expect(new NotFoundError().name).toBe('NotFoundError')
  })

  it('has the correct default message', () => {
    expect(new NotFoundError().message).toBe('مورد درخواستی یافت نشد.')
  })
})

describe('ConflictError', () => {
  it('is an instance of Error', () => {
    expect(new ConflictError('conflict')).toBeInstanceOf(Error)
  })

  it('has name "ConflictError"', () => {
    expect(new ConflictError('conflict').name).toBe('ConflictError')
  })

  it('stores the message correctly', () => {
    const err = new ConflictError('این هدیه قبلاً رزرو شده است.')
    expect(err.message).toBe('این هدیه قبلاً رزرو شده است.')
  })
})

describe('UnauthorizedError', () => {
  it('is an instance of Error', () => {
    expect(new UnauthorizedError()).toBeInstanceOf(Error)
  })

  it('has name "UnauthorizedError"', () => {
    expect(new UnauthorizedError().name).toBe('UnauthorizedError')
  })

  it('has the correct default message', () => {
    expect(new UnauthorizedError().message).toBe('برای ادامه باید وارد شوید.')
  })
})
