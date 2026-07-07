import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConfirmDialog from '@/components/common/ConfirmDialog'

// Radix UI Dialog uses portals — jsdom handles them fine.
// Focus trap is provided natively by Radix Dialog.Content.

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    title: 'حذف آیتم',
    description: 'آیا مطمئن هستید؟',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    confirmLabel: 'تأیید',
    cancelLabel: 'لغو',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with the provided title and description when open', () => {
    render(<ConfirmDialog {...defaultProps} />)

    expect(screen.getByText('حذف آیتم')).toBeDefined()
    expect(screen.getByText('آیا مطمئن هستید؟')).toBeDefined()
  })

  it('clicking the confirm button calls onConfirm', async () => {
    const user = userEvent.setup()
    render(<ConfirmDialog {...defaultProps} />)

    await user.click(screen.getByText('تأیید'))

    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1)
  })

  it('clicking the cancel button calls onCancel', async () => {
    const user = userEvent.setup()
    render(<ConfirmDialog {...defaultProps} />)

    await user.click(screen.getByText('لغو'))

    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1)
  })

  it('pressing Escape calls onCancel', async () => {
    const user = userEvent.setup()
    render(<ConfirmDialog {...defaultProps} />)

    await user.keyboard('{Escape}')

    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1)
  })

  it('dialog is not rendered when open is false', () => {
    render(<ConfirmDialog {...defaultProps} open={false} />)

    expect(screen.queryByText('حذف آیتم')).toBeNull()
    expect(screen.queryByText('آیا مطمئن هستید؟')).toBeNull()
  })

  it('has aria-labelledby and aria-describedby on the dialog content', () => {
    render(<ConfirmDialog {...defaultProps} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-labelledby')).toBe('confirm-dialog-title')
    expect(dialog.getAttribute('aria-describedby')).toBe('confirm-dialog-description')
  })

  it('focus is trapped inside the dialog — focus starts inside the dialog content', () => {
    render(<ConfirmDialog {...defaultProps} />)

    const dialog = screen.getByRole('dialog')
    // Radix sets focus inside Dialog.Content on open;
    // verify the active element is within the dialog subtree
    expect(dialog.contains(document.activeElement)).toBe(true)
  })
})
