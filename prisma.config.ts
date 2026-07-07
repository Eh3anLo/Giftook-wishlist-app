import 'dotenv/config'
import path from 'node:path'
import { defineConfig, env } from 'prisma/config'
console.log(process.env.DATABASE_URL)
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'node prisma/seed.js',
  },
  datasource: {
    url: "postgresql://postgres:1234@localhost:5432/giftwish",
    // url: process.env.DATABASE_URL,
  },
})
