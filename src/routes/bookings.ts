import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// POST /api/bookings - Create new booking
router.post('/', async (req, res) => {
  try {
    const { tutorId, date } = req.body;
    // Assume user from auth, but for now, mock
    const studentId = req.user?.id; // Need auth middleware
    const booking = await prisma.booking.create({
      data: {
        studentId,
        tutorId,
        date: new Date(date),
      },
    });
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// GET /api/bookings - Get user's bookings
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const bookings = await prisma.booking.findMany({
      where: role === 'STUDENT' ? { studentId: userId } : { tutorId: userId },
      include: {
        student: true,
        tutor: true,
        review: true,
      },
    });
    res.json(bookings);
  } catch (error) {
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
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// PATCH /api/bookings/:id - Update status
router.patch('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

export default router;