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

const REPLACEMENTS = [
  {
    target: "Insurance guidance & emergency supplies",
    replacement: "Recovery guidance & emergency supplies"
  },
  {
    target: "Insurance & Relief",
    replacement: "Financial Relief"
  },
  {
    target: "streamline insurance claims",
    replacement: "streamline government aid"
  },
  {
    target: "Insurance Partner",
    replacement: "Relief Partner"
  },
  {
    target: "Field feedback from insurance team",
    replacement: "Field feedback from relief team"
  }
];

const themeSeed = {
  page: 'theme',
  section: 'fonts',
  sortOrder: 0,
  content: {
    headingFont: "Geist",
    bodyFont: "Plus Jakarta Sans",
    headingFontUrl: "https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&display=swap",
    bodyFontUrl: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap%22"
  }
};

async function main() {
  console.log('=== Seeding New Landing Data Safely ===\n');

  // 1. Seed the theme section
  console.log('Checking for theme fonts section...');
  const existingTheme = await prisma.landingContent.findFirst({
    where: { page: 'theme', section: 'fonts' }
  });

  if (existingTheme) {
    await prisma.landingContent.update({
      where: { id: existingTheme.id },
      data: { content: themeSeed.content }
    });
    console.log('✓ Updated existing theme fonts section.');
  } else {
    await prisma.landingContent.create({
      data: {
        page: themeSeed.page,
        section: themeSeed.section,
        sortOrder: themeSeed.sortOrder,
        content: themeSeed.content
      }
    });
    console.log('✓ Created new theme fonts section.');
  }

  const records = await prisma.landingContent.findMany();
  let updatedRecordsCount = 0;

  for (const record of records) {
    if (record.page === 'theme') continue; // Skip theme

    const originalStr = JSON.stringify(record.content);
    let updatedStr = originalStr;
    let hasChanges = false;

    for (const rep of REPLACEMENTS) {
      if (updatedStr.includes(rep.target)) {
        console.log(`[Match] Page: ${record.page}, Section: ${record.section}`);
        console.log(`  Replacing: "${rep.target}" -> "${rep.replacement}"`);
        updatedStr = updatedStr.split(rep.target).join(rep.replacement);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      const updatedContent = JSON.parse(updatedStr);
      await prisma.landingContent.update({
        where: { id: record.id },
        data: { content: updatedContent }
      });
      console.log(`✓ Updated references in ${record.page} -> ${record.section}\n`);
      updatedRecordsCount++;
    }
  }

  console.log(`\n=== Seeding Complete: Updated ${updatedRecordsCount} sections with new references and set up theme fonts. ===`);
}

main()
  .catch((e) => {
    console.error('Error seeding new landing data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    pool.end();
  });
