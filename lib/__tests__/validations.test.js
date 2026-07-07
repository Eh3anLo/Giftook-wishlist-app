import { describe, it, expect } from 'vitest'
import {
  validateWishlist,
  validateGiftItem,
  validateRegistration,
  validateUrl,
  validatePrice,
} from '@/lib/validations.js'

// ---------------------------------------------------------------------------
// validateUrl
// ---------------------------------------------------------------------------
describe('validateUrl', () => {
  it('returns valid for http:// URL', () => {
    expect(validateUrl('http://example.com').valid).toBe(true)
  })

  it('returns valid for https:// URL', () => {
    expect(validateUrl('https://example.com').valid).toBe(true)
  })

  it('returns invalid for a URL without protocol', () => {
    expect(validateUrl('example.com').valid).toBe(false)
  })

  it('returns invalid for ftp:// URL', () => {
    expect(validateUrl('ftp://example.com').valid).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// validatePrice
// ---------------------------------------------------------------------------
describe('validatePrice', () => {
  it('returns valid for 0.01 (minimum)', () => {
    expect(validatePrice(0.01).valid).toBe(true)
  })

  it('returns valid for 999999999.99 (maximum)', () => {
    expect(validatePrice(999999999.99).valid).toBe(true)
  })

  it('returns valid for an integer price', () => {
    expect(validatePrice(100).valid).toBe(true)
  })

  it('returns invalid for 0', () => {
    expect(validatePrice(0).valid).toBe(false)
  })

  it('returns invalid for a negative number', () => {
    expect(validatePrice(-1).valid).toBe(false)
  })

  it('returns invalid for a price exceeding max', () => {
    expect(validatePrice(1000000000).valid).toBe(false)
  })

  it('returns invalid for 3 decimal places', () => {
    expect(validatePrice('1.001').valid).toBe(false)
  })

  it('returns invalid for non-numeric string', () => {
    expect(validatePrice('abc').valid).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// validateWishlist
// ---------------------------------------------------------------------------
describe('validateWishlist', () => {
  const validBase = {
    title: 'تولدم',
    description: 'آرزوهای تولد',
    coverImage: 'https://example.com/cover.jpg',
    occasion: 'birthday',
    visibility: 'public',
  }

  it('returns valid for a fully valid input', () => {
    expect(validateWishlist(validBase)).toEqual({ valid: true })
  })

  it('returns invalid with field "title" when title is empty', () => {
    const result = validateWishlist({ ...validBase, title: '' })
    expect(result.valid).toBe(false)
    expect(result.field).toBe('title')
  })

  it('returns invalid with field "title" when title is only whitespace', () => {
    const result = validateWishlist({ ...validBase, title: '   ' })
    expect(result.valid).toBe(false)
    expect(result.field).toBe('title')
  })

  it('returns invalid with field "title" for 101-char title', () => {
    const result = validateWishlist({ ...validBase, title: 'a'.repeat(101) })
    expect(result.valid).toBe(false)
    expect(result.field).toBe('title')
  })

  it('returns valid for a 1-char title', () => {
    expect(validateWishlist({ ...validBase, title: 'a' })).toEqual({ valid: true })
  })

  it('returns valid for a 100-char title', () => {
    expect(validateWishlist({ ...validBase, title: 'a'.repeat(100) })).toEqual({ valid: true })
  })

  it('returns invalid with field "description" for 501-char description', () => {
    const result = validateWishlist({ ...validBase, description: 'a'.repeat(501) })
    expect(result.valid).toBe(false)
    expect(result.field).toBe('description')
  })

  it('returns valid for a 500-char description', () => {
    expect(validateWishlist({ ...validBase, description: 'a'.repeat(500) })).toEqual({ valid: true })
  })

  it('returns invalid with field "visibility" for an invalid visibility value', () => {
    const result = validateWishlist({ ...validBase, visibility: 'secret' })
    expect(result.valid).toBe(false)
    expect(result.field).toBe('visibility')
  })

  it('returns valid for all valid visibility values', () => {
    for (const v of ['public', 'private', 'link_only']) {
      expect(validateWishlist({ ...validBase, visibility: v }).valid).toBe(true)
    }
  })

  it('returns invalid with field "occasion" for an invalid occasion value', () => {
    const result = validateWishlist({ ...validBase, occasion: 'christmas' })
    expect(result.valid).toBe(false)
    expect(result.field).toBe('occasion')
  })

  it('returns invalid with field "coverImage" for URL without protocol', () => {
    const result = validateWishlist({ ...validBase, coverImage: 'example.com/cover.jpg' })
    expect(result.valid).toBe(false)
    expect(result.field).toBe('coverImage')
  })

  it('returns valid for a valid https coverImage URL', () => {
    expect(validateWishlist({ ...validBase, coverImage: 'https://cdn.example.com/img.png' })).toEqual({ valid: true })
  })

  it('returns valid when optional fields are omitted', () => {
    expect(validateWishlist({ title: 'simple list' })).toEqual({ valid: true })
  })
})

// ---------------------------------------------------------------------------
// validateGiftItem
// ---------------------------------------------------------------------------
describe('validateGiftItem', () => {
  const validBase = {
    title: 'هدفون',
    description: 'بی‌سیم',
    price: '1500',
    url: 'https://example.com/item',
    imageUrl: 'https://example.com/img.jpg',
    priority: 'high',
    notes: 'رنگ مشکی',
  }

  it('returns valid for a fully valid input', () => {
    expect(validateGiftItem(validBase)).toEqual({ valid: true })
  })

  it('returns invalid with field "title" when title is empty', () => {
    const result = validateGiftItem({ ...validBase, title: '' })
    expect(result.valid).toBe(false)
    expect(result.field).toBe('title')
  })

  it('returns invalid with field "title" for 151-char title', () => {
    const result = validateGiftItem({ ...validBase, title: 'a'.repeat(151) })
    expect(result.valid).toBe(false)
    expect(result.field).toBe('title')
  })

  it('returns valid for a 150-char title', () => {
    expect(validateGiftItem({ ...validBase, title: 'a'.repeat(150) })).toEqual({ valid: true })
  })

  it('returns invalid with field "price" for a negative price', () => {
    const result = validateGiftItem({ ...validBase, price: -10 })
    expect(result.valid).toBe(false)
    expect(result.field).toBe('price')
  })

  it('returns invalid with field "price" for price of 0', () => {
    const result = validateGiftItem({ ...validBase, price: 0 })
    expect(result.valid).toBe(false)
    expect(result.field).toBe('price')
  })

  it('returns valid for price of 0.01', () => {
    expect(validateGiftItem({ ...validBase, price: 0.01 })).toEqual({ valid: true })
  })

  it('returns invalid with field "price" for price with 3 decimal places', () => {
    const result = validateGiftItem({ ...validBase, price: '1.001' })
    expect(result.valid).toBe(false)
    expect(result.field).toBe('price')
  })

  it('returns invalid with field "price" for price exceeding max', () => {
    const result = validateGiftItem({ ...validBase, price: 9999999999 })
    expect(result.valid).toBe(false)
    expect(result.field).toBe('price')
  })

  it('returns invalid with field "url" for URL without protocol', () => {
    const result = validateGiftItem({ ...validBase, url: 'example.com' })
    expect(result.valid).toBe(false)
    expect(result.field).toBe('url')
  })

  it('returns invalid with field "imageUrl" for imageUrl without protocol', () => {
    const result = validateGiftItem({ ...validBase, imageUrl: 'cdn.example.com/img.jpg' })
    expect(result.valid).toBe(false)
    expect(result.field).toBe('imageUrl')
  })

  it('returns invalid with field "priority" for invalid priority value', () => {
    const result = validateGiftItem({ ...validBase, priority: 'urgent' })
    expect(result.valid).toBe(false)
    expect(result.field).toBe('priority')
  })

  it('returns valid when all optional fields are omitted', () => {
    expect(validateGiftItem({ title: 'کتاب' })).toEqual({ valid: true })
  })
})

// ---------------------------------------------------------------------------
// validateRegistration
// ---------------------------------------------------------------------------
describe('validateRegistration', () => {
  const validBase = {
    email: 'user@example.com',
    password: 'password123',
    name: 'علی',
  }

  it('returns valid for a fully valid input', () => {
    expect(validateRegistration(validBase)).toEqual({ valid: true })
  })

  it('returns invalid with field "email" when email is missing', () => {
    const result = validateRegistration({ ...validBase, email: undefined })
    expect(result.valid).toBe(false)
    expect(result.field).toBe('email')
  })

  it('returns invalid with field "email" for invalid email format', () => {
    const result = validateRegistration({ ...validBase, email: 'not-an-email' })
    expect(result.valid).toBe(false)
    expect(result.field).toBe('email')
  })

  it('returns invalid with field "password" for 7-char password', () => {
    const result = validateRegistration({ ...validBase, password: '1234567' })
    expect(result.valid).toBe(false)
    expect(result.field).toBe('password')
  })

  it('returns valid for an 8-char password', () => {
    expect(validateRegistration({ ...validBase, password: '12345678' })).toEqual({ valid: true })
  })

  it('returns invalid with field "password" when password is missing', () => {
    const result = validateRegistration({ ...validBase, password: undefined })
    expect(result.valid).toBe(false)
    expect(result.field).toBe('password')
  })

  it('returns valid when optional name is omitted', () => {
    expect(validateRegistration({ email: 'a@b.com', password: 'abcdefgh' })).toEqual({ valid: true })
  })
})
