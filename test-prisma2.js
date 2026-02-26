const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const v1 = await prisma.volunteer.findUnique({ where: { id: 'cmm3dj1sc00009zs4z3pkr171' }});
  const v2 = await prisma.volunteer.findUnique({ where: { id: '806b2f81-00fe-41ba-b181-4de668aba6c8' }});
  console.log("Found v1?", !!v1);
  console.log("Found v2?", !!v2);
  const count = await prisma.volunteer.count();
  console.log("Total volunteers:", count);
  const v = await prisma.volunteer.findFirst();
  console.log("Sample volunteer ID:", v?.id);
}
main();
