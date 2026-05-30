const prisma = require('./src/lib/prisma');
async function main() {
  const d = await prisma.adminDisaster.findFirst({ where: { title: { contains: 'Holmes Chapel' } }});
  console.log(JSON.stringify(d.assignedVolunteers, null, 2));
}
main().catch(console.error).finally(()=>prisma.$disconnect());
