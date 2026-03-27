import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/tutors - Get all tutors with filters
router.get('/', async (req, res) => {
  try {
    const { subject, minRating, maxPrice } = req.query;
    const tutors = await prisma.tutorProfile.findMany({
      include: {
        user: true,
        categories: true,
      },
      where: {
        ...(subject && {
          categories: {
            some: {
              name: subject as string,
            },
          },
        }),
        ...(minRating && { rating: { gte: parseFloat(minRating as string) } }),
        ...(maxPrice && { price: { lte: parseFloat(maxPrice as string) } }),
      },
    });
    res.json(tutors);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tutors' });
  }
});

// GET /api/tutors/:id - Get tutor details
router.get('/:id', async (req, res) => {
  try {
    const tutor = await prisma.tutorProfile.findUnique({
      where: { userId: req.params.id },
      include: {
        user: true,
        categories: true,
        availabilities: true,
      },
    });
    if (!tutor) return res.status(404).json({ error: 'Tutor not found' });
    res.json(tutor);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tutor' });
  }
});

// GET /api/categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

export default router;