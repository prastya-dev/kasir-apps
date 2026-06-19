# 🍜 Kasir Bakso & Es Teh — PWA POS System

Aplikasi kasir full-stack berbasis PWA untuk warung bakso & es teh.

## Stack
- **Frontend**: Next.js 14 (Pages Router) + Tailwind CSS + PWA (next-pwa)
- **Backend**: Express.js + TypeScript + Socket.io
- **Database**: PostgreSQL + Prisma ORM
- **State**: Zustand
- **Auth**: JWT (8 jam)

## Struktur Monorepo
```
kasir-pwa/
├── apps/
│   ├── web/          → Next.js PWA (port 3000)
│   └── api/          → Express.js API (port 4000)
└── docker-compose.yml
```

## Setup Lokal

### 1. Install dependencies
```bash
pnpm install
```

### 2. Setup database
```bash
# Copy env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# Edit DATABASE_URL dan JWT_SECRET di apps/api/.env

# Jalankan migration + seed
pnpm db:migrate
pnpm db:seed
```

### 3. Jalankan dev server
```bash
pnpm dev
```

### Akun Default (dari seed)
| Role  | Email              | Password  |
|-------|--------------------|-----------|
| Admin | admin@kasir.com    | admin123  |
| Kasir | kasir@kasir.com    | kasir123  |

## URL
| Halaman             | URL                          |
|---------------------|------------------------------|
| Login Admin/Kasir   | http://localhost:3000/login  |
| Dashboard           | http://localhost:3000/dashboard |
| POS Kasir           | http://localhost:3000/dashboard/pos |
| Kitchen Display     | http://localhost:3000/dashboard/kitchen |
| QR Generator        | http://localhost:3000/dashboard/qr-generator |
| E-Menu Pelanggan    | http://localhost:3000/order?table=1 |

## Docker
```bash
docker-compose up -d
# Kemudian jalankan migration:
docker-compose exec api npx prisma migrate deploy
docker-compose exec api npx ts-node prisma/seed.ts
```

## Fitur
### Pelanggan (PWA)
- ✅ Self-order via QR code meja
- ✅ E-menu interaktif (stok real-time)
- ✅ Catatan pesanan per item
- ✅ Tracker status pesanan real-time (WebSocket)

### Admin & Kasir (Dashboard)
- ✅ POS walk-in (cash & cashless)
- ✅ Notifikasi pesanan masuk (Socket.io)
- ✅ Kitchen Display System (KDS)
- ✅ Manajemen menu & stok harian
- ✅ QR code generator per meja
- ✅ Laporan keuangan & buku kas
- ✅ ACID transaction saat konfirmasi bayar

## API Endpoints
```
POST   /api/auth/login
GET    /api/auth/me

GET    /api/menus
POST   /api/menus           (admin)
PATCH  /api/menus/:id       (admin/kasir)
PATCH  /api/menus/:id/stock (admin)

POST   /api/orders
GET    /api/orders          (admin/kasir)
GET    /api/orders/kitchen  (admin/kasir)
GET    /api/orders/:id
PATCH  /api/orders/:id/status (admin/kasir)
PATCH  /api/orders/:id/pay    (admin/kasir)

GET    /api/dashboard/summary
GET    /api/dashboard/recent-orders

POST   /api/financial/expense
GET    /api/financial/logs
GET    /api/financial/report/monthly
```

## Socket.io Events
| Event               | Room          | Arah            | Payload                    |
|---------------------|---------------|-----------------|----------------------------|
| `new-order`         | `dashboard`   | server → client | Order baru masuk           |
| `payment-confirmed` | `dashboard`   | server → client | Pembayaran dikonfirmasi    |
| `order-status-update` | `order-{id}` | server → client | Update status pesanan      |
| `new-kitchen-order` | `kitchen`     | server → client | Pesanan masuk dapur        |
| `order-updated`     | `kitchen`     | server → client | Status pesanan diupdate    |
