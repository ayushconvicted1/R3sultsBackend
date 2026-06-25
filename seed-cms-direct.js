const { PrismaClient } = require('@prisma/client');
const seedData = require('./src/utils/landingContentSeed');

// Initialize Prisma client directly (using native Rust driver)
const prisma = new PrismaClient({
  log: ['error', 'warn']
});

async function main() {
  console.log('Seeding Landing Content CMS data directly...');
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
