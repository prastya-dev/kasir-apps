import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Seed admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@kasir.com' },
    update: {},
    create: {
      name: 'Admin Utama',
      email: 'admin@kasir.com',
      password: hashedPassword,
      role: UserRole.admin,
    },
  })

  const kasir = await prisma.user.upsert({
    where: { email: 'kasir@kasir.com' },
    update: {},
    create: {
      name: 'Kasir 1',
      email: 'kasir@kasir.com',
      password: await bcrypt.hash('kasir123', 10),
      role: UserRole.kasir,
    },
  })

  // Seed menus
  const menus = [
    { name: 'Bakso Biasa', price: 12000, cost: 5000, stock: 50 },
    { name: 'Bakso Urat', price: 15000, cost: 6500, stock: 40 },
    { name: 'Bakso Urat Jumbo', price: 20000, cost: 9000, stock: 30 },
    { name: 'Bakso Telur', price: 15000, cost: 6000, stock: 35 },
    { name: 'Mie Ayam Bakso', price: 18000, cost: 8000, stock: 25 },
    { name: 'Es Teh Manis', price: 5000, cost: 1500, stock: 100 },
    { name: 'Es Teh Tawar', price: 4000, cost: 1000, stock: 100 },
    { name: 'Es Jeruk', price: 6000, cost: 2000, stock: 60 },
    { name: 'Air Mineral', price: 3000, cost: 1500, stock: 80 },
  ]

  for (const menu of menus) {
    await prisma.menu.upsert({
      where: { id: menu.name }, // using name as temp key
      update: {},
      create: {
        name: menu.name,
        price: menu.price,
        costPerPortion: menu.cost,
        dailyStock: menu.stock,
        isAvailable: true,
      },
    }).catch(() =>
      prisma.menu.create({
        data: {
          name: menu.name,
          price: menu.price,
          costPerPortion: menu.cost,
          dailyStock: menu.stock,
          isAvailable: true,
        },
      })
    )
  }

  console.log('✅ Seed selesai:', { admin: admin.email, kasir: kasir.email })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
