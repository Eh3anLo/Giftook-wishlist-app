"use client"

import * as Dialog from '@radix-ui/react-dialog'

/**
 * ConfirmDialog — accessible confirmation modal built with Radix UI Dialog.
 *
 * Radix Dialog provides a built-in focus trap and manages aria attributes.
 * Keyboard Escape closes the dialog via onEscapeKeyDown.
 *
 * Props:
 *  - open (bool): controls visibility
 *  - title (string): dialog heading
 *  - description (string): body text / warning message
 *  - onConfirm (fn): called when the confirm button is clicked
 *  - onCancel (fn): called when the cancel button or overlay is clicked
 *  - confirmLabel (string): confirm button label (default: "تأیید")
 *  - cancelLabel (string): cancel button label (default: "لغو")
 */
export default function ConfirmDialog({
  open,
  title = 'تأیید عملیات',
  description = 'آیا از انجام این عملیات مطمئن هستید؟',
  onConfirm,
  onCancel,
  confirmLabel = 'تأیید',
  cancelLabel = 'لغو',
}) {
  const titleId = 'confirm-dialog-title'
  const descId = 'confirm-dialog-description'

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel?.() }}>
      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Content — Radix Dialog.Content provides automatic focus trap */}
        <Dialog.Content
          dir="rtl"
          aria-labelledby={titleId}
          aria-describedby={descId}
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background p-6 shadow-lg focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          onEscapeKeyDown={(e) => {
            e.preventDefault()
            onCancel?.()
          }}
          onInteractOutside={() => onCancel?.()}
        >
          <Dialog.Title id={titleId} className="mb-2 text-lg font-semibold text-foreground">
            {title}
          </Dialog.Title>

          <Dialog.Description id={descId} className="mb-6 text-sm text-muted-foreground">
            {description}
          </Dialog.Description>

          <div className="flex justify-end gap-3">
            {/* Cancel — on the left side in RTL (secondary action) */}
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {cancelLabel}
            </button>

            {/* Confirm (destructive) — on the right side in RTL (primary/dangerous action) */}
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50"
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
