import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
const router = Router();
const prisma = new PrismaClient();
// POST /api/bookings - Create new booking
router.post('/', async (req, res) => {
    try {
        const { tutorId, date, studentId } = req.body; // Add studentId to request body for now
        // Validate required fields
        if (!studentId || !tutorId || !date) {
            return res.status(400).json({ error: 'studentId, tutorId, and date are required' });
        }
        // Allow different students to book the same slot, but prevent duplicate booking for the same student.
        const existingForStudent = await prisma.booking.findFirst({
            where: {
                studentId,
                tutorId,
                date: new Date(date),
                status: {
                    in: ['CONFIRMED', 'COMPLETED'],
                },
            },
            select: { id: true },
        });
        if (existingForStudent) {
            return res.status(409).json({ message: 'You already booked this slot.' });
        }
        const booking = await prisma.booking.create({
            data: {
                studentId,
                tutorId,
                date: new Date(date),
                status: 'CONFIRMED', // Explicitly set status
            },
        });
        res.json(booking);
    }
    catch (error) {
        console.error('Booking creation error:', error instanceof Error ? error.message : String(error));
        res.status(500).json({ error: 'Failed to create booking' });
    }
});
// GET /api/bookings - Get user's bookings
router.get('/', async (req, res) => {
    try {
        const { userId, role } = req.query; // Get from query params for now
        if (!userId) {
            return res.status(400).json({ error: 'userId query parameter required' });
        }
        const bookings = await prisma.booking.findMany({
            where: role === 'STUDENT' ? { studentId: userId } : { tutorId: userId },
            include: {
                student: true,
                tutor: true,
                review: true,
            },
        });
        res.json(bookings);
    }
    catch (error) {
        console.error('Fetch bookings error:', error instanceof Error ? error.message : String(error));
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});
// GET /api/bookings/:id
router.get('/:id', async (req, res) => {
    try {
        const booking = await prisma.booking.findUnique({
            where: { id: req.params.id },
            include: {
                student: true,
                tutor: true,
                review: true,
            },
        });
        if (!booking)
            return res.status(404).json({ error: 'Booking not found' });
        res.json(booking);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch booking' });
    }
});
// PATCH /api/bookings/:id - Update status
router.patch('/:id', async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['CONFIRMED', 'COMPLETED', 'CANCELLED'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
            });
        }
        const booking = await prisma.booking.update({
            where: { id: req.params.id },
            data: { status },
        });
        res.json(booking);
    }
    catch (error) {
        console.error('Update booking error:', error instanceof Error ? error.message : String(error));
        const prismaError = error;
        if (prismaError?.code === 'P2025') {
            return res.status(404).json({ error: 'Booking not found' });
        }
        res.status(500).json({ error: 'Failed to update booking' });
    }
});
export default router;
//# sourceMappingURL=bookings.js.map