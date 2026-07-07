import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReserveButton from '@/components/gift/ReserveButton'

// Mock next/navigation (used indirectly; window.location is used for 401 redirect)
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/test-path',
}))

// Helper: build a mock Response
function mockResponse({ status = 200, body = {} } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  }
}

describe('ReserveButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
    // Reset window.location.href (jsdom allows assignment)
    delete window.location
    window.location = { href: '', pathname: '/wishlist/123' }
  })

  // ─── Rendering ─────────────────────────────────────────────────────────────

  it('renders "رزرو کن" button when isReserved is false', () => {
    render(
      <ReserveButton
        giftItemId="gift-1"
        reservationId={null}
        isReserved={false}
        isOwnReservation={false}
      />
    )
    expect(screen.getByRole('button', { name: 'رزرو کن' })).toBeDefined()
  })

  it('renders disabled "رزرو شده" badge when isReserved:true and isOwnReservation:false', () => {
    render(
      <ReserveButton
        giftItemId="gift-1"
        reservationId={null}
        isReserved={true}
        isOwnReservation={false}
      />
    )
    const badge = screen.getByText('رزرو شده')
    expect(badge).toBeDefined()
    // It should NOT be a button — it is a span with aria-disabled
    expect(badge.tagName).toBe('SPAN')
    expect(badge.getAttribute('aria-disabled')).toBe('true')
  })

  it('clicking the "رزرو شده" badge does NOT call fetch', async () => {
    const user = userEvent.setup()
    render(
      <ReserveButton
        giftItemId="gift-1"
        reservationId={null}
        isReserved={true}
        isOwnReservation={false}
      />
    )
    const badge = screen.getByText('رزرو شده')
    await user.click(badge)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('renders "لغو رزرو" button when isOwnReservation is true', () => {
    render(
      <ReserveButton
        giftItemId="gift-1"
        reservationId="res-99"
        isReserved={true}
        isOwnReservation={true}
      />
    )
    expect(screen.getByRole('button', { name: 'لغو رزرو' })).toBeDefined()
  })

  // ─── Reserve (POST) flow ────────────────────────────────────────────────────

  it('clicking "رزرو کن" calls POST /api/reservations with giftItemId and optimistically shows reserved state', async () => {
    const user = userEvent.setup()
    // Make fetch hang so we can check the optimistic state before it resolves
    let resolveFetch
    global.fetch = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        })
    )

    render(
      <ReserveButton
        giftItemId="gift-1"
        reservationId={null}
        isReserved={false}
        isOwnReservation={false}
      />
    )

    await user.click(screen.getByRole('button', { name: 'رزرو کن' }))

    // Optimistic update: button should now show loading/cancel state immediately
    // The button text changes to "در حال رزرو..." indicating the optimistic update happened
    expect(screen.queryByRole('button', { name: 'رزرو کن' })).toBeNull()

    // Verify fetch was called with the right args
    expect(global.fetch).toHaveBeenCalledWith('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ giftItemId: 'gift-1' }),
    })

    // Resolve to avoid unhandled promises
    resolveFetch(mockResponse({ status: 201, body: { id: 'res-1', giftItemId: 'gift-1', createdAt: new Date().toISOString() } }))
  })

  it('on POST 201 success, UI stays in reserved / own-reservation state', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockResolvedValue(
      mockResponse({ status: 201, body: { id: 'res-1', giftItemId: 'gift-1', createdAt: new Date().toISOString() } })
    )

    render(
      <ReserveButton
        giftItemId="gift-1"
        reservationId={null}
        isReserved={false}
        isOwnReservation={false}
      />
    )

    await user.click(screen.getByRole('button', { name: 'رزرو کن' }))

    // After success, should show cancel button (own reservation)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'لغو رزرو' })).toBeDefined()
    })
    expect(screen.queryByRole('button', { name: 'رزرو کن' })).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('on POST failure (non-2xx), UI rolls back to "رزرو کن" and displays Persian error', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockResolvedValue(
      mockResponse({ status: 500, body: { error: 'خطای سرور.' } })
    )

    render(
      <ReserveButton
        giftItemId="gift-1"
        reservationId={null}
        isReserved={false}
        isOwnReservation={false}
      />
    )

    await user.click(screen.getByRole('button', { name: 'رزرو کن' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'رزرو کن' })).toBeDefined()
    })
    expect(screen.getByRole('alert').textContent).toBe('خطای سرور.')
  })

  it('on POST returning 409, displays "این هدیه قبلاً رزرو شده است." inline', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockResolvedValue(
      mockResponse({ status: 409, body: { error: 'conflict' } })
    )

    render(
      <ReserveButton
        giftItemId="gift-1"
        reservationId={null}
        isReserved={false}
        isOwnReservation={false}
      />
    )

    await user.click(screen.getByRole('button', { name: 'رزرو کن' }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe('این هدیه قبلاً رزرو شده است.')
    })
    // Rollback — "رزرو کن" should be back
    expect(screen.getByRole('button', { name: 'رزرو کن' })).toBeDefined()
  })

  it('on POST returning 401, redirects to /login with callbackUrl', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockResolvedValue(
      mockResponse({ status: 401, body: { error: 'Unauthorized' } })
    )

    render(
      <ReserveButton
        giftItemId="gift-1"
        reservationId={null}
        isReserved={false}
        isOwnReservation={false}
      />
    )

    await user.click(screen.getByRole('button', { name: 'رزرو کن' }))

    await waitFor(() => {
      expect(window.location.href).toBe('/login?callbackUrl=%2Fwishlist%2F123')
    })
  })

  // ─── Cancel reservation (DELETE) flow ──────────────────────────────────────

  it('clicking "لغو رزرو" calls DELETE /api/reservations/[reservationId] and optimistically shows "رزرو کن"', async () => {
    const user = userEvent.setup()
    let resolveFetch
    global.fetch = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        })
    )

    render(
      <ReserveButton
        giftItemId="gift-1"
        reservationId="res-99"
        isReserved={true}
        isOwnReservation={true}
      />
    )

    await user.click(screen.getByRole('button', { name: 'لغو رزرو' }))

    // Optimistic update: button should disappear immediately
    expect(screen.queryByRole('button', { name: 'لغو رزرو' })).toBeNull()

    // Fetch should have been called with the right endpoint
    expect(global.fetch).toHaveBeenCalledWith('/api/reservations/res-99', {
      method: 'DELETE',
    })

    // Resolve to avoid unhandled promises
    resolveFetch({ ok: true, status: 204, json: vi.fn().mockResolvedValue({}) })
  })

  it('on DELETE 204 success, UI stays in unreserved state ("رزرو کن")', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204, json: vi.fn().mockResolvedValue({}) })

    render(
      <ReserveButton
        giftItemId="gift-1"
        reservationId="res-99"
        isReserved={true}
        isOwnReservation={true}
      />
    )

    await user.click(screen.getByRole('button', { name: 'لغو رزرو' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'رزرو کن' })).toBeDefined()
    })
    expect(screen.queryByRole('button', { name: 'لغو رزرو' })).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('on DELETE failure, UI rolls back to "لغو رزرو" and displays Persian error', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockResolvedValue(
      mockResponse({ status: 500, body: { error: 'خطا در لغو رزرو.' } })
    )

    render(
      <ReserveButton
        giftItemId="gift-1"
        reservationId="res-99"
        isReserved={true}
        isOwnReservation={true}
      />
    )

    await user.click(screen.getByRole('button', { name: 'لغو رزرو' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'لغو رزرو' })).toBeDefined()
    })
    expect(screen.getByRole('alert').textContent).toBe('خطا در لغو رزرو.')
  })
})
