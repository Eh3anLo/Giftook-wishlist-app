import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

try {
  const count = await prisma.user.count()
  console.log('DB connection OK. User count:', count)
} catch (e) {
  console.error('DB connection FAILED:', e.message)
} finally {
  await prisma.$disconnect()
}
