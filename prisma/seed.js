import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
    // Seed admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.upsert({
        where: { email: 'admin@skillbridge.com' },
        update: {},
        create: {
            email: 'admin@skillbridge.com',
            password: hashedPassword,
            name: 'Admin',
            role: 'ADMIN',
        },
    });
    // Seed categories
    const categories = ['Math', 'Science', 'English', 'History', 'Programming'];
    for (const name of categories) {
        await prisma.category.upsert({
            where: { name },
            update: {},
            create: { name },
        });
    }
    console.log('Seeded admin and categories');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map