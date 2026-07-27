import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import { getTodayJalali, daysInJalaliMonth } from '../lib/jalaliMonths.js'

console.log(process.env.DATABASE_URL)

const pool = new Pool({ connectionString: "postgresql://postgres:1234@localhost:5432/giftwish" })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const DEMO_PASSWORD = '12345678'

/** Adds `offsetDays` days to a Jalali month/day pair, wrapping across months/year. */
function addDaysToJalali(month, day, offsetDays) {
  let m = month
  let d = day + offsetDays
  while (d > daysInJalaliMonth(m)) {
    d -= daysInJalaliMonth(m)
    m += 1
    if (m > 12) m = 1
  }
  return { month: m, day: d }
}

async function clearExistingData() {
  // Delete in dependency order — explicit, so it doesn't rely on
  // assuming cascade behavior for every relation.
  await prisma.reservation.deleteMany()
  await prisma.giftItem.deleteMany()
  await prisma.wishlist.deleteMany()
  await prisma.follow.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()
}

async function main() {
  console.log('در حال پاک‌سازی داده‌های قبلی...')
  await clearExistingData()

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)
  const today = getTodayJalali()
  const soon = addDaysToJalali(today.month, today.day, 5)
  const later = addDaysToJalali(today.month, today.day, 18)

  console.log('در حال ساخت کاربران...')

  // Main demo account — log in as this one during the presentation.
  const sara = await prisma.user.create({
    data: {
      email: 'sara@example.com',
      name: 'سارا احمدی',
      passwordHash,
      bio: 'عاشق کتاب، قهوه، و برنامه‌ریزی برای مهمونی‌های کوچیک 🌸',
      birthMonth: today.month,
      birthDay: today.day, // "امروز!" در ویجت تولد دوستان
    },
  })

  const ali = await prisma.user.create({
    data: {
      email: 'ali@example.com',
      name: 'علی رضایی',
      passwordHash,
      bio: 'کوهنورد آخر هفته‌ها، برنامه‌نویس بقیه روزها.',
      birthMonth: soon.month,
      birthDay: soon.day,
    },
  })

  const maryam = await prisma.user.create({
    data: {
      email: 'maryam@example.com',
      name: 'مریم کریمی',
      passwordHash,
      bio: 'طراح گرافیک، عاشق گیاهان آپارتمانی.',
      birthMonth: later.month,
      birthDay: later.day,
    },
  })

  const amir = await prisma.user.create({
    data: {
      email: 'amir@example.com',
      name: 'امیر حسینی',
      passwordHash,
      bio: 'فقط یک دنبال‌کننده کنجکاو 👀',
    },
  })

  console.log('در حال ساخت روابط دنبال‌کردن...')

  // سارا و علی دوست هستند (دنبال‌کردن متقابل)
  await prisma.follow.create({ data: { followerId: sara.id, followingId: ali.id } })
  await prisma.follow.create({ data: { followerId: ali.id, followingId: sara.id } })

  // سارا و مریم هم دوست هستند
  await prisma.follow.create({ data: { followerId: sara.id, followingId: maryam.id } })
  await prisma.follow.create({ data: { followerId: maryam.id, followingId: sara.id } })

  // امیر فقط سارا را دنبال می‌کند (یک‌طرفه — دوست محسوب نمی‌شود)
  await prisma.follow.create({ data: { followerId: amir.id, followingId: sara.id } })

  console.log('در حال ساخت لیست‌های آرزو...')

  const birthdayWishlist = await prisma.wishlist.create({
    data: {
      userId: sara.id,
      title: 'تولد من امسال 🎂',
      description: 'چیزهایی که امسال واقعاً خوشحالم می‌کنه!',
      occasion: 'birthday',
      visibility: 'public',
      shareToken: nanoid(21),
      showReserverIdentity: true,
    },
  })

  const weddingWishlist = await prisma.wishlist.create({
    data: {
      userId: sara.id,
      title: 'لیست عروسی',
      description: 'با تشکر از همه عزیزانی که در این روز خاص همراه ما هستند.',
      occasion: 'wedding',
      visibility: 'link_only',
      shareToken: nanoid(21),
      showReserverIdentity: false,
    },
  })

  const archivedWishlist = await prisma.wishlist.create({
    data: {
      userId: sara.id,
      title: 'کریسمس پارسال',
      description: 'لیست سال قبل — دیگه لازم نیست.',
      occasion: 'holiday',
      visibility: 'private',
      shareToken: nanoid(21),
      showReserverIdentity: false,
      archived: true,
    },
  })

  const aliWishlist = await prisma.wishlist.create({
    data: {
      userId: ali.id,
      title: 'لیست آرزوهای علی',
      description: 'یه سری چیز که واسه اتاقم لازم دارم.',
      occasion: 'other',
      visibility: 'public',
      shareToken: nanoid(21),
      showReserverIdentity: true,
    },
  })

  console.log('در حال ساخت آیتم‌های هدیه...')

  const [
    headphones,
    novel,
    plant,
    coffeeMaker,
    perfume,
    lamp,
    aliMonitor,
    aliChair,
  ] = await Promise.all([
    prisma.giftItem.create({
      data: {
        wishlistId: birthdayWishlist.id,
        title: 'هدفون بی‌سیم سونی',
        description: 'برای پیاده‌روی‌های صبحگاهی با موزیک خوب.',
        price: 3200000,
        priority: 'high',
        url: 'https://www.digikala.com/search/?q=هدفون بی سیم سونی',
        source: 'manual',
      },
    }),
    prisma.giftItem.create({
      data: {
        wishlistId: birthdayWishlist.id,
        title: 'مجموعه رمان‌های هاروکی موراکامی',
        description: 'هنوز چندتاشو نخوندم!',
        price: 950000,
        priority: 'medium',
        source: 'manual',
      },
    }),
    prisma.giftItem.create({
      data: {
        wishlistId: birthdayWishlist.id,
        title: 'گیاه پوتوس آپارتمانی',
        description: 'یه گیاه که واقعاً نمی‌میره حتی دست من!',
        price: 450000,
        priority: 'low',
        source: 'genie',
      },
    }),
    prisma.giftItem.create({
      data: {
        wishlistId: birthdayWishlist.id,
        title: 'قهوه‌ساز فرنچ پرس',
        description: 'صبح‌های آخر هفته با قهوه دم‌کرده.',
        price: 780000,
        priority: 'medium',
        source: 'genie',
      },
    }),
    prisma.giftItem.create({
      data: {
        wishlistId: weddingWishlist.id,
        title: 'ست عطر و ادکلن',
        price: 2100000,
        priority: 'high',
        source: 'manual',
      },
    }),
    prisma.giftItem.create({
      data: {
        wishlistId: weddingWishlist.id,
        title: 'چراغ رومیزی دیزاینی',
        price: 1350000,
        priority: null,
        source: 'manual',
      },
    }),
    prisma.giftItem.create({
      data: {
        wishlistId: aliWishlist.id,
        title: 'مانیتور ۲۷ اینچ',
        price: 8500000,
        priority: 'high',
        source: 'manual',
      },
    }),
    prisma.giftItem.create({
      data: {
        wishlistId: aliWishlist.id,
        title: 'صندلی ارگونومیک',
        price: 6200000,
        priority: 'medium',
        source: 'manual',
      },
    }),
  ])

  console.log('در حال ساخت رزروها...')

  // رزرو توسط یک دوست (مریم)، همراه با پیام — بدون اطلاعات خرید
  await prisma.reservation.create({
    data: {
      giftItemId: novel.id,
      userId: maryam.id,
      message: 'می‌دونم عاشق موراکامی هستی، امیدوارم خوشت بیاد 📚',
    },
  })

  // رزرو کامل با اطلاعات خرید ثبت‌شده (رسید + آدرس + کد رهگیری) — برای دموی فیچر مدرک خرید
  await prisma.reservation.create({
    data: {
      giftItemId: headphones.id,
      userId: ali.id,
      message: 'تولدت مبارک سارا جان 🎉',
      receiptImageUrl: 'https://example.com/demo-receipt.jpg',
      shippingAddress: 'تهران، خیابان ولیعصر، پلاک ۱۲۳',
      trackingCode: 'IR-1029384756',
    },
  })

  // رزرو مهمان (بدون حساب کاربری) — برای دموی جریان رزرو مهمان
  await prisma.reservation.create({
    data: {
      giftItemId: plant.id,
      guestName: 'خاله نگین',
      guestEmail: 'negin@example.com',
      guestPhone: '09121234567',
      message: 'با عشق از طرف خاله نگین 🌿',
    },
  })

  // رزرو دیگر روی لیست علی
  await prisma.reservation.create({
    data: {
      giftItemId: aliChair.id,
      userId: sara.id,
      message: 'موفق باشی رفیق!',
    },
  })

  console.log('✅ Seed با موفقیت انجام شد.\n')
  console.log('حساب‌های دمو (رمز عبور همه: Password123!):')
  console.log(`  سارا احمدی   — ${sara.email}  (حساب اصلی دمو)`)
  console.log(`  علی رضایی    — ${ali.email}`)
  console.log(`  مریم کریمی   — ${maryam.email}`)
  console.log(`  امیر حسینی   — ${amir.email}`)
  console.log(`\nلینک عمومی لیست تولد سارا: /w/${birthdayWishlist.shareToken}`)
  console.log(`لینک عمومی لیست علی: /w/${aliWishlist.shareToken}`)
}

main()
  .catch((error) => {
    console.error('❌ خطا در اجرای seed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })