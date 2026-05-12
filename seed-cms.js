const prisma = require('./src/lib/prisma');
const seedData = require('./src/utils/landingContentSeed');

async function main() {
  console.log('Seeding Landing Content CMS data...');
  let saved = 0;

  for (const item of seedData) {
    await prisma.landingContent.upsert({
      where: { page_section: { page: item.page, section: item.section } },
      update: { content: item.content, sortOrder: item.sortOrder ?? 0 },
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
