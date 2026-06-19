export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu Konfirmasi',
  dimasak: 'Sedang Dimasak',
  selesai: 'Siap Disajikan',
  batal: 'Dibatalkan',
}

export const ORDER_STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  dimasak: 'bg-blue-100 text-blue-800',
  selesai: 'bg-green-100 text-green-800',
  batal: 'bg-red-100 text-red-800',
}
