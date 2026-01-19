import { prisma } from '../src/db/prisma';

async function checkRoles() {
  try {
    const users = await prisma.adminUser.findMany({
      select: {
        id: true,
        username: true,
        role: true,
      },
    });

    console.log('Current users and roles:');
    for (const user of users) {
      console.log(`- ${user.username}: ${user.role}`);
    }

    const distinctRoles = [...new Set(users.map(u => u.role))];
    console.log('\nDistinct roles:', distinctRoles);

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkRoles();
