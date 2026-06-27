const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const homePageSeed = require('./src/utils/homePageContentSeed');

const directUrl = "postgresql://neondb_owner:npg_eQZCfm5uY6xv@ep-wild-wildflower-a1o9v0sv.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

const pool = new Pool({
  connectionString: directUrl,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('=== Database Seeding Script ===\n');

  // ONLY seed Home Page Content as requested, never touch landing_content
  console.log('Seeding Home Page CMS (home_page_content)...');
  const existingHome = await prisma.homePageContent.findFirst();
  let homeRecord;
  if (existingHome) {
    homeRecord = await prisma.homePageContent.update({
      where: { id: existingHome.id },
      data: {
        content: homePageSeed,
        version: existingHome.version + 1,
      },
    });
    console.log(`✓ Successfully updated existing Home Page CMS content (v${homeRecord.version}).\n`);
  } else {
    homeRecord = await prisma.homePageContent.create({
      data: {
        content: homePageSeed,
        version: 1,
      },
    });
    console.log(`✓ Successfully created new Home Page CMS content (v1).\n`);
  }

  console.log('=== Seeding Complete ===');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    pool.end();
  });
