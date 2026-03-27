import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// PUT /api/tutor/profile - Update tutor profile
router.put('/profile', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { bio, price, categories } = req.body;
    const tutorProfile = await prisma.tutorProfile.upsert({
      where: { userId },
      update: { bio, price },
      create: { userId, bio, price },
    });
    if (categories) {
      // Update categories
      await prisma.tutorProfile.update({
        where: { userId },
        data: {
          categories: {
            set: categories.map((id: string) => ({ id })),
          },
        },
      });
    }
    res.json(tutorProfile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/tutor/availability - Update availability
router.put('/availability', async (req, res) => {
  try {
    const userId = req.user?.id;
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId },
    });
    if (!tutorProfile) return res.status(404).json({ error: 'Tutor profile not found' });
    const { availabilities } = req.body;
    // Delete existing
    await prisma.availability.deleteMany({
      where: { tutorId: tutorProfile.id },
    });
    // Create new
    const newAvailabilities = await prisma.availability.createMany({
      data: availabilities.map((a: any) => ({ ...a, tutorId: tutorProfile.id })),
    });
    res.json(newAvailabilities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

export default router;