/**
 * EmptyState — centered empty state block with optional icon and CTA.
 *
 * Props:
 *  - message (string): Persian message to display
 *  - icon (ReactNode, optional): icon element rendered above the message
 *  - action ({ label, href }, optional): CTA button/link config
 */
export default function EmptyState({ message, icon, action }) {
  return (
    <div
      dir="rtl"
      className="flex flex-col items-center justify-center gap-4 py-16 text-center"
    >
      {icon && (
        <div className="text-muted-foreground" aria-hidden="true">
          {icon}
        </div>
      )}

      <p className="text-base text-muted-foreground">{message}</p>

      {action && (
        <a
          href={action.href}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {action.label}
        </a>
      )}
    </div>
  )
}
