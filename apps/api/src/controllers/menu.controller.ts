import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const menuSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().nullable(),
  price: z.number().positive(),
  costPerPortion: z.number().positive(),
  dailyStock: z.number().int().min(0).default(0),
  isAvailable: z.boolean().default(true),
  category: z.enum(['makanan', 'minuman']).default('makanan'),
});

export async function getAllMenus(req: Request, res: Response) {
  try {
    const menus = await prisma.menu.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    return res.json({ success: true, data: menus });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getMenuById(req: Request, res: Response) {
  try {
    const menu = await prisma.menu.findUnique({ where: { id: req.params.id } });
    if (!menu) return res.status(404).json({ success: false, message: 'Menu tidak ditemukan' });
    return res.json({ success: true, data: menu });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function createMenu(req: Request, res: Response) {
  try {
    const body = menuSchema.parse(req.body);
    const menu = await prisma.menu.create({ data: body as any });
    return res.status(201).json({ success: true, data: menu });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function updateMenu(req: Request, res: Response) {
  try {
    const body = menuSchema.partial().parse(req.body);
    const menu = await prisma.menu.update({
      where: { id: req.params.id },
      data: body as any,
    });
    return res.json({ success: true, data: menu });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function deleteMenu(req: Request, res: Response) {
  try {
    await prisma.menu.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: 'Menu berhasil dihapus' });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

// Reset stok harian (dipanggil tiap pagi)
export async function resetDailyStock(req: Request, res: Response) {
  try {
    const updates = req.body as Array<{ id: string; dailyStock: number }>;

    await prisma.$transaction(
      updates.map(({ id, dailyStock }) =>
        prisma.menu.update({ where: { id }, data: { dailyStock, isAvailable: true } })
      )
    );

    return res.json({ success: true, message: 'Stok harian berhasil direset' });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
