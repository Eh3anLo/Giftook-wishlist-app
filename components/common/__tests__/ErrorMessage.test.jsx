import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ErrorMessage from '@/components/common/ErrorMessage'

describe('ErrorMessage', () => {
  it('renders the provided Persian message string', () => {
    render(<ErrorMessage message="این فیلد الزامی است." />)

    expect(screen.getByText('این فیلد الزامی است.')).toBeDefined()
  })

  it('applies a red color class', () => {
    render(<ErrorMessage message="خطا رخ داد" />)

    const el = screen.getByRole('alert')
    // text-red-600 is the red variant applied
    expect(el.className).toContain('text-red-600')
  })

  it('is right-aligned (text-right class)', () => {
    render(<ErrorMessage message="خطا رخ داد" />)

    const el = screen.getByRole('alert')
    expect(el.className).toContain('text-right')
  })

  it('has role="alert" for accessibility', () => {
    render(<ErrorMessage message="مقدار وارد شده معتبر نیست." />)

    expect(screen.getByRole('alert')).toBeDefined()
  })

  it('renders nothing when message is empty string', () => {
    const { container } = render(<ErrorMessage message="" />)

    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when message is not provided', () => {
    const { container } = render(<ErrorMessage />)

    expect(container.firstChild).toBeNull()
  })
})
