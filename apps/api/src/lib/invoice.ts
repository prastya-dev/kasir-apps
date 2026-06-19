export function generateInvoiceNumber(): string {
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')
  const time = now.getTime().toString().slice(-4)
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `INV-${date}-${time}${random}`
}
