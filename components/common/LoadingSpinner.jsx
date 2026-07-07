/**
 * LoadingSpinner — centered loading indicator with accessible aria-label.
 * Uses Tailwind CSS animation classes.
 */
export default function LoadingSpinner({ className = '' }) {
  return (
    <div
      role="status"
      aria-label="در حال بارگذاری..."
      className={`flex items-center justify-center ${className}`}
    >
      <div
        className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary"
        aria-hidden="true"
      />
    </div>
  )
}
