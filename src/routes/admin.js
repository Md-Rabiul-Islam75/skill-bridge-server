import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
const router = Router();
const prisma = new PrismaClient();
// GET /api/admin/users - Get all users
router.get('/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            include: {
                tutorProfile: true,
            },
        });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});
// PATCH /api/admin/users/:id - Update user status
router.patch('/users/:id', async (req, res) => {
    try {
        const { role } = req.body;
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { role },
        });
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update user' });
    }
});
// GET /api/admin/bookings - All bookings
router.get('/bookings', async (req, res) => {
    try {
        const bookings = await prisma.booking.findMany({
            include: {
                student: true,
                tutor: true,
                review: true,
            },
        });
        res.json(bookings);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});
export default router;
//# sourceMappingURL=admin.js.map