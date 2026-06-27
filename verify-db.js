const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const directUrl = "postgresql://neondb_owner:npg_eQZCfm5uY6xv@ep-wild-wildflower-a1o9v0sv.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

const pool = new Pool({
  connectionString: directUrl,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const landingCount = await prisma.landingContent.count();
  const homeCount = await prisma.homePageContent.count();
  const homeRow = await prisma.homePageContent.findFirst();

  console.log('=== Database Verification ===');
  console.log('landingContent count:', landingCount);
  console.log('homePageContent count:', homeCount);
  console.log('homePageContent ID:', homeRow ? homeRow.id : 'None');
  console.log('homePageContent Version:', homeRow ? homeRow.version : 'None');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    pool.end();
  });
