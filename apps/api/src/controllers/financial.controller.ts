import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const pengeluaranSchema = z.object({
  amount: z.number().positive(),
  category: z.enum(['pembelian_bahan', 'operasional', 'lainnya']),
  description: z.string().min(3),
});

export async function addPengeluaran(req: Request, res: Response) {
  try {
    const body = pengeluaranSchema.parse(req.body);

    const log = await prisma.financialLog.create({
      data: {
        logType: 'pengeluaran',
        amount: body.amount,
        category: body.category,
        description: body.description,
      },
    });

    return res.status(201).json({ success: true, data: log });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getDailyReport(req: Request, res: Response) {
  try {
    const dateParam = (req.query.date as string) || new Date().toISOString().slice(0, 10);

    const start = new Date(dateParam);
    const end = new Date(dateParam);
    end.setDate(end.getDate() + 1);

    const logs = await prisma.financialLog.findMany({
      where: { loggedAt: { gte: start, lt: end } },
      orderBy: { loggedAt: 'desc' },
    });

    // Hitung ringkasan
    const totalPemasukan = logs
      .filter((l) => l.logType === 'pemasukan')
      .reduce((s, l) => s + Number(l.amount), 0);

    const totalPengeluaran = logs
      .filter((l) => l.logType === 'pengeluaran')
      .reduce((s, l) => s + Number(l.amount), 0);

    // Hitung total HPP dari order_items hari ini
    const ordersToday = await prisma.order.findMany({
      where: {
        createdAt: { gte: start, lt: end },
        paymentStatus: 'paid',
      },
      include: { orderItems: true },
    });

    const totalHPP = ordersToday.reduce((sum, order) => {
      return (
        sum +
        order.orderItems.reduce((s, item) => s + Number(item.costAtSale) * item.quantity, 0)
      );
    }, 0);

    const labaBersih = totalPemasukan - totalHPP - totalPengeluaran;

    return res.json({
      success: true,
      data: {
        date: dateParam,
        totalPemasukan,
        totalPengeluaran,
        totalHPP,
        labaKotor: totalPemasukan - totalHPP,
        labaBersih,
        totalTransaksi: ordersToday.length,
        logs,
      },
    });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getMonthlyReport(req: Request, res: Response) {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const logs = await prisma.financialLog.groupBy({
      by: ['logType'],
      where: { loggedAt: { gte: start, lt: end } },
      _sum: { amount: true },
    });

    const pemasukan = logs.find((l) => l.logType === 'pemasukan')?._sum.amount || 0;
    const pengeluaran = logs.find((l) => l.logType === 'pengeluaran')?._sum.amount || 0;

    const ordersMonth = await prisma.order.findMany({
      where: { createdAt: { gte: start, lt: end }, paymentStatus: 'paid' },
      include: { orderItems: true },
    });

    const totalHPP = ordersMonth.reduce(
      (sum, o) =>
        sum + o.orderItems.reduce((s, i) => s + Number(i.costAtSale) * i.quantity, 0),
      0
    );

    return res.json({
      success: true,
      data: {
        year,
        month,
        totalPemasukan: Number(pemasukan),
        totalPengeluaran: Number(pengeluaran),
        totalHPP,
        labaKotor: Number(pemasukan) - totalHPP,
        labaBersih: Number(pemasukan) - totalHPP - Number(pengeluaran),
        totalTransaksi: ordersMonth.length,
      },
    });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
