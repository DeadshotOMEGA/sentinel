import { prisma } from '../src/db/prisma';

async function checkConstraint() {
  try {
    const result = await prisma.$queryRaw`
      SELECT conname, contype
      FROM pg_constraint
      WHERE conrelid = 'admin_users'::regclass
      AND conname = 'admin_users_role_check';
    `;

    console.log('Constraint check result:', result);

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkConstraint();
