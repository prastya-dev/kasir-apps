import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { formatRupiah, formatDate } from '@/lib/format'

interface Summary { totalIncome: number; totalExpenses: number; netProfit: number }
interface Log { id: string; logType: string; amount: number; category: string; description: string; loggedAt: string }

export default function FinancialPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [logs, setLogs] = useState<Log[]>([])
  const [form, setForm] = useState({ amount: '', category: 'operasional', description: '' })
  const [saving, setSaving] = useState(false)

  const now = new Date()
  const fetchData = () => {
    api.get(`/financial/report/monthly?year=${now.getFullYear()}&month=${now.getMonth() + 1}`)
      .then((r) => setSummary(r.data))
    api.get('/financial/logs').then((r) => setLogs(r.data))
  }

  useEffect(() => { fetchData() }, [])

  const addExpense = async () => {
    if (!form.amount || !form.description) return
    setSaving(true)
    try {
      await api.post('/financial/expense', {
        amount: parseFloat(form.amount),
        category: form.category,
        description: form.description,
      })
      setForm({ amount: '', category: 'operasional', description: '' })
      fetchData()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary-600 text-white px-4 py-3 flex items-center gap-3">
        <Link href="/dashboard" className="text-white/80 hover:text-white">←</Link>
        <h1 className="font-bold">📊 Laporan Keuangan</h1>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-3 gap-3">
            <div className="card text-center">
              <div className="text-xs text-gray-500 mb-1">Pendapatan</div>
              <div className="font-bold text-green-600 text-sm">{formatRupiah(summary.totalIncome)}</div>
            </div>
            <div className="card text-center">
              <div className="text-xs text-gray-500 mb-1">Pengeluaran</div>
              <div className="font-bold text-red-600 text-sm">{formatRupiah(summary.totalExpenses)}</div>
            </div>
            <div className="card text-center">
              <div className="text-xs text-gray-500 mb-1">Laba Bersih</div>
              <div className={`font-bold text-sm ${summary.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatRupiah(summary.netProfit)}
              </div>
            </div>
          </div>
        )}

        {/* Add Expense */}
        <div className="card">
          <h3 className="font-semibold mb-3 text-sm">Catat Pengeluaran</h3>
          <div className="space-y-2">
            <input placeholder="Nominal (Rp)" type="number" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input" />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input">
              <option value="pembelian_bahan">Pembelian Bahan</option>
              <option value="operasional">Operasional</option>
              <option value="lainnya">Lainnya</option>
            </select>
            <input placeholder="Keterangan (cth: Beli tabung gas LPG 3kg)" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" />
            <button onClick={addExpense} disabled={saving} className="btn-primary w-full">
              {saving ? 'Menyimpan...' : 'Catat Pengeluaran'}
            </button>
          </div>
        </div>

        {/* Log */}
        <div className="card">
          <h3 className="font-semibold mb-3 text-sm">Riwayat Mutasi</h3>
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <div className="text-sm font-medium">{log.description}</div>
                  <div className="text-xs text-gray-400">{log.category} · {formatDate(log.loggedAt)}</div>
                </div>
                <span className={`font-bold text-sm ${log.logType === 'pemasukan' ? 'text-green-600' : 'text-red-600'}`}>
                  {log.logType === 'pemasukan' ? '+' : '-'}{formatRupiah(Number(log.amount))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
