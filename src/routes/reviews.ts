import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// POST /api/reviews - Create review
router.post('/', async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;
    const review = await prisma.review.create({
      data: {
        bookingId,
        rating,
        comment,
      },
    });
    // Update tutor rating
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tutor: { include: { tutorProfile: true } } },
    });
    if (booking) {
      const tutorProfile = booking.tutor.tutorProfile;
      if (tutorProfile) {
        const newRating = (tutorProfile.rating * tutorProfile.reviewCount + rating) / (tutorProfile.reviewCount + 1);
        await prisma.tutorProfile.update({
          where: { id: tutorProfile.id },
          data: {
            rating: newRating,
            reviewCount: tutorProfile.reviewCount + 1,
          },
        });
      }
    }
    res.json(review);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create review' });
  }
});

export default router;