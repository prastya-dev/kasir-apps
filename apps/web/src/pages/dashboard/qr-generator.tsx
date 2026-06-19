import { useState } from 'react'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'

export default function QRGeneratorPage() {
  const [tableCount, setTableCount] = useState(10)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

  const tables = Array.from({ length: tableCount }, (_, i) => i + 1)

  const handlePrint = () => window.print()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary-600 text-white px-4 py-3 flex items-center gap-3 print:hidden">
        <Link href="/dashboard" className="text-white/80 hover:text-white">←</Link>
        <h1 className="font-bold">📱 QR Code Generator Meja</h1>
      </header>

      <div className="p-4 max-w-3xl mx-auto">
        <div className="card mb-4 print:hidden">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Jumlah Meja:</label>
            <input
              type="number"
              value={tableCount}
              onChange={(e) => setTableCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="input w-24"
              min={1}
              max={50}
            />
            <button onClick={handlePrint} className="btn-primary ml-auto">🖨️ Print Semua</button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {tables.map((n) => {
            const url = `${baseUrl}/order?table=${n}`
            return (
              <div key={n} className="bg-white rounded-xl p-4 text-center border border-gray-200 shadow-sm">
                <div className="text-sm font-bold text-gray-700 mb-2">MEJA {n}</div>
                <QRCodeSVG value={url} size={120} className="mx-auto" />
                <div className="text-xs text-gray-400 mt-2 break-all">/order?table={n}</div>
              </div>
            )
          })}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          header, .print\\:hidden { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  )
}
