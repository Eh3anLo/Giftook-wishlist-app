/**
 * Pure validation functions for request bodies.
 * Each function returns { valid: boolean, error?: string, field?: string }.
 * No side effects, no database calls.
 */

const VALID_OCCASIONS = ['birthday', 'wedding', 'holiday', 'other']
const VALID_VISIBILITIES = ['public', 'private', 'link_only']
const VALID_PRIORITIES = ['low', 'medium', 'high']

/**
 * Validates a URL string — must start with http:// or https://.
 * @param {string} url
 * @returns {{ valid: boolean }}
 */
export function validateUrl(url) {
  if (typeof url !== 'string') return { valid: false }
  return { valid: url.startsWith('http://') || url.startsWith('https://') }
}

/**
 * Validates a price value.
 * Must be numeric, between 0.01 and 999999999.99, and have at most 2 decimal places.
 * @param {*} price
 * @returns {{ valid: boolean }}
 */
export function validatePrice(price) {
  const num = Number(price)
  if (!Number.isFinite(num)) return { valid: false }
  if (num < 0.01 || num > 999999999.99) return { valid: false }

  // Check at most 2 decimal places by inspecting the string representation
  const str = String(price)
  const dotIndex = str.indexOf('.')
  if (dotIndex !== -1 && str.length - dotIndex - 1 > 2) return { valid: false }

  return { valid: true }
}

/**
 * Validates wishlist creation/update data.
 * @param {object} data
 * @returns {{ valid: boolean, error?: string, field?: string }}
 */
export function validateWishlist(data) {
  const { title, description, coverImage, occasion, visibility } = data ?? {}

  // title: required, 1–100 chars
  if (!title || typeof title !== 'string' || title.trim().length === 0 || title.length > 100) {
    return {
      valid: false,
      error: 'عنوان لیست آرزوها الزامی است و نباید بیش از ۱۰۰ کاراکتر باشد.',
      field: 'title',
    }
  }

  // description: optional, max 500 chars
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string' || description.length > 500) {
      return {
        valid: false,
        error: 'توضیحات نباید بیش از ۵۰۰ کاراکتر باشد.',
        field: 'description',
      }
    }
  }

  // coverImage: optional, must start with http:// or https:// if provided
  if (coverImage !== undefined && coverImage !== null && coverImage !== '') {
    if (!validateUrl(coverImage).valid) {
      return {
        valid: false,
        error: 'آدرس تصویر باید با http:// یا https:// شروع شود.',
        field: 'coverImage',
      }
    }
  }

  // occasion: optional, must be one of the valid set if provided
  if (occasion !== undefined && occasion !== null && occasion !== '') {
    if (!VALID_OCCASIONS.includes(occasion)) {
      return {
        valid: false,
        error: 'نوع مناسبت معتبر نیست.',
        field: 'occasion',
      }
    }
  }

  // visibility: optional, must be one of the valid set if provided
  if (visibility !== undefined && visibility !== null && visibility !== '') {
    if (!VALID_VISIBILITIES.includes(visibility)) {
      return {
        valid: false,
        error: 'مقدار نمایش‌پذیری معتبر نیست.',
        field: 'visibility',
      }
    }
  }

  return { valid: true }
}

/**
 * Validates gift item creation/update data.
 * @param {object} data
 * @returns {{ valid: boolean, error?: string, field?: string }}
 */
export function validateGiftItem(data) {
  const { title, description, price, url, imageUrl, priority, notes } = data ?? {}

  // title: required, 1–150 chars
  if (!title || typeof title !== 'string' || title.trim().length === 0 || title.length > 150) {
    return {
      valid: false,
      error: 'عنوان هدیه الزامی است و نباید بیش از ۱۵۰ کاراکتر باشد.',
      field: 'title',
    }
  }

  // description: optional, max 1000 chars
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string' || description.length > 1000) {
      return {
        valid: false,
        error: 'توضیحات نباید بیش از ۱۰۰۰ کاراکتر باشد.',
        field: 'description',
      }
    }
  }

  // price: optional, but if provided must pass validatePrice
  if (price !== undefined && price !== null && price !== '') {
    if (!validatePrice(price).valid) {
      return {
        valid: false,
        error: 'قیمت باید عددی مثبت با حداکثر دو رقم اعشار و در محدوده مجاز باشد.',
        field: 'price',
      }
    }
  }

  // url: optional, must start with http:// or https:// if provided
  if (url !== undefined && url !== null && url !== '') {
    if (!validateUrl(url).valid) {
      return {
        valid: false,
        error: 'آدرس لینک باید با http:// یا https:// شروع شود.',
        field: 'url',
      }
    }
  }

  // imageUrl: optional, must start with http:// or https:// if provided
  if (imageUrl !== undefined && imageUrl !== null && imageUrl !== '') {
    if (!validateUrl(imageUrl).valid) {
      return {
        valid: false,
        error: 'آدرس تصویر باید با http:// یا https:// شروع شود.',
        field: 'imageUrl',
      }
    }
  }

  // priority: optional, must be one of the valid set if provided
  if (priority !== undefined && priority !== null && priority !== '') {
    if (!VALID_PRIORITIES.includes(priority)) {
      return {
        valid: false,
        error: 'سطح اولویت معتبر نیست.',
        field: 'priority',
      }
    }
  }

  // notes: optional, max 500 chars
  if (notes !== undefined && notes !== null) {
    if (typeof notes !== 'string' || notes.length > 500) {
      return {
        valid: false,
        error: 'یادداشت‌ها نباید بیش از ۵۰۰ کاراکتر باشد.',
        field: 'notes',
      }
    }
  }

  return { valid: true }
}

/**
 * Validates user registration data.
 * @param {object} data
 * @returns {{ valid: boolean, error?: string, field?: string }}
 */
export function validateRegistration(data) {
  const { email, password, name } = data ?? {}

  // email: required, valid format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
    return {
      valid: false,
      error: 'آدرس ایمیل معتبر نیست.',
      field: 'email',
    }
  }

  // password: required, min 8 chars
  if (!password || typeof password !== 'string' || password.length < 8) {
    return {
      valid: false,
      error: 'رمز عبور باید حداقل ۸ کاراکتر باشد.',
      field: 'password',
    }
  }

  // name: optional, max 100 chars if provided
  if (name !== undefined && name !== null && name !== '') {
    if (typeof name !== 'string' || name.length > 100) {
      return {
        valid: false,
        error: 'نام نباید بیش از ۱۰۰ کاراکتر باشد.',
        field: 'name',
      }
    }
  }

  return { valid: true }
}


const GENIE_DESCRIPTION_MAX = 500
const GENIE_OCCASION_MAX = 50

/**
 * Validates the payload for POST /api/wishlists/[id]/genie
 * @param {{ description: string, budget?: number, occasion?: string }} data
 * @returns {{ valid: boolean, error?: string, field?: string }}
 */
export function validateGenieRequest(data) {
  const { description, budget, occasion } = data ?? {}

  if (!description || typeof description !== 'string' || !description.trim()) {
    return { valid: false, error: 'توضیح گیرنده هدیه الزامی است.', field: 'description' }
  }

  if (description.trim().length < 5) {
    return { valid: false, error: 'توضیح خیلی کوتاه است. کمی بیشتر بنویس.', field: 'description' }
  }

  if (description.length > GENIE_DESCRIPTION_MAX) {
    return {
      valid: false,
      error: `توضیح نباید بیشتر از ${GENIE_DESCRIPTION_MAX} کاراکتر باشد.`,
      field: 'description',
    }
  }

  if (budget !== undefined && budget !== null && budget !== '') {
    const numericBudget = Number(budget)
    if (!Number.isFinite(numericBudget) || numericBudget <= 0) {
      return { valid: false, error: 'بودجه باید عددی مثبت باشد.', field: 'budget' }
    }
  }

  if (occasion !== undefined && occasion !== null && occasion !== '') {
    if (typeof occasion !== 'string' || occasion.length > GENIE_OCCASION_MAX) {
      return { valid: false, error: 'مناسبت نامعتبر است.', field: 'occasion' }
    }
  }

  return { valid: true }
}
