import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// PUT /api/tutor/profile - Update tutor profile
router.put('/profile', async (req, res) => {
  try {
    const { userId, bio, price, categoryIds } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // First, ensure tutor profile exists
    const tutorProfile = await prisma.tutorProfile.upsert({
      where: { userId },
      update: {
        bio,
        ...(price !== undefined ? { price: parseFloat(price) } : {}),
      },
      create: {
        userId,
        bio,
        price: price == null ? null : parseFloat(price),
      },
    });

    // Update categories if provided
    if (categoryIds && Array.isArray(categoryIds)) {
      await prisma.tutorProfile.update({
        where: { userId },
        data: {
          categories: {
            set: categoryIds.map((id: string) => ({ id })),
          },
        },
      });
    }

    // Return updated profile with categories
    const updatedProfile = await prisma.tutorProfile.findUnique({
      where: { userId },
      include: {
        categories: true,
        user: true,
      },
    });

    res.json(updatedProfile);
  } catch (error) {
    console.error('Update profile error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/tutor/availability - Update availability
router.put('/availability', async (req, res) => {
  try {
    const { userId, availabilities } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!availabilities || !Array.isArray(availabilities)) {
      return res.status(400).json({ error: 'availabilities array is required' });
    }

    // Get tutor profile
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId },
    });

    if (!tutorProfile) {
      return res.status(404).json({ error: 'Tutor profile not found. Please create a profile first.' });
    }

    // Validate availability format
    const validatedAvailabilities = availabilities.map((a: any) => {
      if (!a.day || !a.startTime || !a.endTime) {
        throw new Error('Each availability must have day, startTime, and endTime');
      }
      return {
        tutorId: tutorProfile.id,
        day: a.day,
        startTime: a.startTime,
        endTime: a.endTime,
      };
    });

    // Delete existing availability
    await prisma.availability.deleteMany({
      where: { tutorId: tutorProfile.id },
    });

    // Create new availability
    const newAvailabilities = await prisma.availability.createMany({
      data: validatedAvailabilities,
    });

    // Return updated availability
    const updatedAvailabilities = await prisma.availability.findMany({
      where: { tutorId: tutorProfile.id },
    });

    res.json(updatedAvailabilities);
  } catch (error) {
    console.error('Update availability error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.message.includes('Each availability must have')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

export default router;