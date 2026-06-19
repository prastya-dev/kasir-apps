import { Router } from 'express';
import * as auth from '../controllers/auth.controller';
import * as menu from '../controllers/menu.controller';
import * as order from '../controllers/order.controller';
import * as financial from '../controllers/financial.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// ─── AUTH ─────────────────────────────────────────────────
router.post('/auth/login', auth.login);
router.post('/auth/register', authenticate, authorize('admin'), auth.register);
router.get('/auth/me', authenticate, auth.me);

// ─── MENU ─────────────────────────────────────────────────
router.get('/menus', menu.getAllMenus);                              // public (customer bisa lihat)
router.get('/menus/:id', menu.getMenuById);
router.post('/menus', authenticate, authorize('admin'), menu.createMenu);
router.put('/menus/:id', authenticate, authorize('admin'), menu.updateMenu);
router.delete('/menus/:id', authenticate, authorize('admin'), menu.deleteMenu);
router.post('/menus/stock/reset', authenticate, authorize('admin'), menu.resetDailyStock);

// ─── ORDER ─────────────────────────────────────────────────
router.get('/orders', authenticate, authorize('admin', 'kasir'), order.getAllOrders);
router.get('/orders/:id', order.getOrderById);                      // customer bisa cek statusnya
router.post('/orders', order.createOrder);                          // customer & kasir bisa buat order
router.patch('/orders/:id/status', authenticate, authorize('admin', 'kasir'), order.updateOrderStatus);
router.post('/orders/:id/confirm-payment', authenticate, authorize('admin', 'kasir'), order.confirmPayment);

// ─── FINANCIAL ─────────────────────────────────────────────
router.post('/financial/pengeluaran', authenticate, authorize('admin', 'kasir'), financial.addPengeluaran);
router.get('/financial/report/daily', authenticate, authorize('admin'), financial.getDailyReport);
router.get('/financial/report/monthly', authenticate, authorize('admin'), financial.getMonthlyReport);

export default router;
