const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// Direct URL from our configuration
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

async function main() {
  const dryRun = process.argv.includes('--apply') ? false : true;
  if (dryRun) {
    console.log('--- DRY RUN MODE (No changes will be written to DB) ---');
    console.log('Pass "--apply" argument to write changes to the database.\n');
  } else {
    console.log('--- APPLY MODE (Changes will be written to DB) ---\n');
  }

  console.log('Fetching all Landing Content CMS records...');
  const records = await prisma.landingContent.findMany();
  console.log(`Found ${records.length} records in database.`);

  let updatedCount = 0;

  for (const record of records) {
    const originalStr = JSON.stringify(record.content);
    let updatedStr = originalStr;
    let hasChanges = false;

    for (const rep of REPLACEMENTS) {
      if (updatedStr.includes(rep.target)) {
        console.log(`[Match] Page: ${record.page}, Section: ${record.section}`);
        console.log(`  Replacing: "${rep.target}" -> "${rep.replacement}"`);
        // Use split/join to replace all occurrences safely
        updatedStr = updatedStr.split(rep.target).join(rep.replacement);
        hasChanges = true;
      }
    }

    // Double check for any other remaining "insurance" references
    if (updatedStr.toLowerCase().includes('insurance')) {
      console.log(`\n[WARNING] Remaining "insurance" reference detected in ${record.page} -> ${record.section}:`);
      const matches = updatedStr.match(/.{0,30}insurance.{0,30}/gi);
      if (matches) {
        matches.forEach(m => console.log(`  Context: "...${m.trim()}..."`));
      }
    }

    if (hasChanges) {
      updatedCount++;
      if (!dryRun) {
        const updatedContent = JSON.parse(updatedStr);
        await prisma.landingContent.update({
          where: { id: record.id },
          data: { content: updatedContent }
        });
        console.log(`✓ Saved updates for ${record.page} -> ${record.section}\n`);
      } else {
        console.log(`(Dry run) Would save updates for ${record.page} -> ${record.section}\n`);
      }
    }
  }

  console.log(`Process complete. Found and processed ${updatedCount} matching records.`);
}

main()
  .catch((e) => {
    console.error('Error running script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    pool.end();
  });
