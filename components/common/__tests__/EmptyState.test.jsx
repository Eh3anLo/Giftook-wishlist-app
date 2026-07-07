import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import EmptyState from '@/components/common/EmptyState'

describe('EmptyState', () => {
  it('renders the message text', () => {
    render(<EmptyState message="هیچ موردی یافت نشد." />)

    expect(screen.getByText('هیچ موردی یافت نشد.')).toBeDefined()
  })

  it('renders the CTA button with correct href when action prop is provided', () => {
    render(
      <EmptyState
        message="لیستی وجود ندارد."
        action={{ label: 'ایجاد لیست جدید', href: '/wishlists/new' }}
      />
    )

    const link = screen.getByRole('link', { name: 'ایجاد لیست جدید' })
    expect(link).toBeDefined()
    expect(link.getAttribute('href')).toBe('/wishlists/new')
  })

  it('renders without CTA when action is omitted', () => {
    render(<EmptyState message="هیچ موردی یافت نشد." />)

    expect(screen.queryByRole('link')).toBeNull()
  })

  it('renders the optional icon when provided', () => {
    render(
      <EmptyState
        message="خالی است"
        icon={<span data-testid="test-icon">🎁</span>}
      />
    )

    expect(screen.getByTestId('test-icon')).toBeDefined()
  })

  it('renders without icon when icon prop is omitted', () => {
    const { container } = render(<EmptyState message="خالی است" />)

    // Only the message paragraph and no icon wrapper
    expect(screen.queryByTestId('test-icon')).toBeNull()
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull()
  })
})
