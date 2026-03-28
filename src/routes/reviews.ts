import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// POST /api/reviews - Create review
router.post('/', async (req, res) => {
  try {
    const { bookingId, rating, comment, reviewerId } = req.body;

    // Validate required fields
    if (!bookingId || !rating || !reviewerId) {
      return res.status(400).json({ error: 'bookingId, rating, and reviewerId are required' });
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Check if booking exists and belongs to the reviewer
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { student: true, tutor: true, review: true },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if booking already has a review
    if (booking.review) {
      return res.status(400).json({ error: 'Booking already has a review' });
    }

    // Check if reviewer is the student who made the booking
    if (booking.studentId !== reviewerId) {
      return res.status(403).json({ error: 'Only the student who made the booking can leave a review' });
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        bookingId,
        reviewerId,
        rating: parseInt(rating),
        comment,
      },
    });

    // Update tutor rating
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: booking.tutorId },
    });

    if (tutorProfile) {
      const newRating = (tutorProfile.rating * tutorProfile.reviewCount + parseInt(rating)) / (tutorProfile.reviewCount + 1);
      await prisma.tutorProfile.update({
        where: { id: tutorProfile.id },
        data: {
          rating: Math.round(newRating * 10) / 10, // Round to 1 decimal place
          reviewCount: tutorProfile.reviewCount + 1,
        },
      });
    }

    res.json(review);
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

export default router;