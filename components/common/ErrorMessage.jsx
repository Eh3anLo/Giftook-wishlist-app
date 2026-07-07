/**
 * ErrorMessage — inline Persian error block for forms.
 * Right-aligned, red color variant.
 *
 * Props:
 *  - message (string): error text to display
 */
export default function ErrorMessage({ message }) {
  if (!message) return null

  return (
    <p
      role="alert"
      dir="rtl"
      className="mt-1 text-sm text-red-600 text-right"
    >
      {message}
    </p>
  )
}
