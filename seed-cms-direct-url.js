const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const seedData = require('./src/utils/landingContentSeed');

// Direct URL without the "-pooler" suffix
const directUrl = "postgresql://neondb_owner:npg_eQZCfm5uY6xv@ep-wild-wildflower-a1o9v0sv.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

const pool = new Pool({
  connectionString: directUrl,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding Landing Content CMS data via direct connection string...');
  let saved = 0;

  for (const item of seedData) {
    await prisma.landingContent.upsert({
      where: { page_section: { page: item.page, section: item.section } },
      update: { sortOrder: item.sortOrder ?? 0 },
      create: {
        page: item.page,
        section: item.section,
        content: item.content,
        sortOrder: item.sortOrder ?? 0,
      },
    });
    saved++;
    console.log(`✓ Seeded ${item.page} -> ${item.section}`);
  }

  console.log(`\nSuccess! Seeded ${saved} CMS sections.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
