import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { config } from 'dotenv'

// Load .env.local for DATABASE_URL when running seed directly
config({ path: '.env.local' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  // Clean up existing seed data
  await prisma.reservation.deleteMany()
  await prisma.giftItem.deleteMany()
  await prisma.wishlist.deleteMany()
  await prisma.user.deleteMany({ where: { email: 'test@example.com' } })

  // Create test user
  const passwordHash = await bcrypt.hash('password123', 12)
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'کاربر آزمایشی',
      passwordHash,
    },
  })

  // Create wishlist 1 — public
  const wishlist1 = await prisma.wishlist.create({
    data: {
      userId: user.id,
      title: 'لیست تولد',
      description: 'آرزوهای تولدم',
      occasion: 'birthday',
      visibility: 'public',
      shareToken: 'seed-token-public-001',
      showReserverIdentity: false,
    },
  })

  // Create wishlist 2 — private
  const wishlist2 = await prisma.wishlist.create({
    data: {
      userId: user.id,
      title: 'لیست خصوصی',
      description: 'لیست خصوصی من',
      occasion: 'other',
      visibility: 'private',
      shareToken: 'seed-token-private-002',
      showReserverIdentity: false,
    },
  })

  // Gift items for wishlist 1
  await prisma.giftItem.createMany({
    data: [
      {
        wishlistId: wishlist1.id,
        title: 'هدفون سونی',
        description: 'هدفون بی‌سیم با کیفیت بالا',
        price: 5000000,
        priority: 'high',
      },
      {
        wishlistId: wishlist1.id,
        title: 'کتاب برنامه‌نویسی',
        description: 'کتاب یادگیری جاوااسکریپت',
        price: 250000,
        priority: 'medium',
      },
    ],
  })

  // Gift items for wishlist 2
  await prisma.giftItem.createMany({
    data: [
      {
        wishlistId: wishlist2.id,
        title: 'ساعت هوشمند',
        price: 8000000,
        priority: 'high',
      },
      {
        wishlistId: wishlist2.id,
        title: 'کفش ورزشی',
        price: 1500000,
        priority: 'medium',
      },
    ],
  })

  console.log('✓ Seed data created successfully')
  console.log('  Test user: test@example.com / password123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
