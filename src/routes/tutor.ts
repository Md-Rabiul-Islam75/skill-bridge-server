import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/tutor/profile - Fetch tutor profile
router.get('/profile', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId as string },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'TUTOR') {
      return res.status(403).json({ error: 'Only tutors can access tutor profile.' });
    }

    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: userId as string },
      include: { categories: true },
    });

    // Merge user and tutor profile data
    const profile = {
      ...user,
      ...tutorProfile,
      subjects: tutorProfile?.categories?.map((c) => c.name).join(', ') || '',
    };

    res.json({ profile });
  } catch (error) {
    console.error('Fetch profile error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/tutor/profile - Update tutor profile
router.put('/profile', async (req, res) => {
  try {
    const { userId, bio, price, categoryIds, name, email, subjects } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'TUTOR') {
      return res.status(403).json({ error: 'Only tutors can update tutor profile.' });
    }

    // Update User table fields (name, email)
    if (name || email) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          ...(name ? { name } : {}),
          ...(email ? { email } : {}),
        },
      });
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

    // Handle category updates - either from categoryIds or from subjects string
    let categoriesToSet: { id: string }[] = [];
    
    if (categoryIds && Array.isArray(categoryIds)) {
      categoriesToSet = categoryIds.map((id: string) => ({ id }));
    } else if (subjects && typeof subjects === 'string') {
      // Parse comma-separated subjects, create missing categories, then link all.
      const rawNames = subjects
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);

      const uniqueNames: string[] = [];
      const seen = new Set<string>();
      for (const name of rawNames) {
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        uniqueNames.push(name);
      }

      const resolvedCategories = [] as Array<{ id: string }>;

      for (const subjectName of uniqueNames) {
        const existing = await prisma.category.findFirst({
          where: {
            name: {
              equals: subjectName,
              mode: 'insensitive',
            },
          },
          select: { id: true },
        });

        if (existing) {
          resolvedCategories.push({ id: existing.id });
          continue;
        }

        const created = await prisma.category.create({
          data: { name: subjectName },
          select: { id: true },
        });
        resolvedCategories.push({ id: created.id });
      }

      categoriesToSet = resolvedCategories;
    }
    
    // Update categories if we have any to set
    if (categoriesToSet.length > 0 || (subjects === '' && !categoryIds)) {
      await prisma.tutorProfile.update({
        where: { userId },
        data: {
          categories: {
            set: categoriesToSet,
          },
        },
      });
    }

    // Return updated profile with categories and user info
    const updatedProfile = await prisma.tutorProfile.findUnique({
      where: { userId },
      include: {
        categories: true,
        user: true,
      },
    });

    // Transform response to include subjects field
    const response = {
      ...updatedProfile,
      subjects: updatedProfile?.categories?.map((c) => c.name).join(', ') || '',
    };

    res.json(response);
  } catch (error) {
    console.error('Update profile error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /api/tutor/availability - Get current tutor availability
router.get('/availability', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId as string },
      select: { role: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'TUTOR') {
      return res.status(403).json({ error: 'Only tutors can access tutor availability.' });
    }

    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: userId as string },
      include: { availabilities: true },
    });

    if (!tutorProfile) {
      return res.status(404).json({ error: 'Tutor profile not found. Please create a profile first.' });
    }

    res.json({ availability: tutorProfile.availabilities });
  } catch (error) {
    console.error('Fetch availability error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

// PUT /api/tutor/availability - Update availability
router.put('/availability', async (req, res) => {
  try {
    const { userId, availabilities } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'TUTOR') {
      return res.status(403).json({ error: 'Only tutors can update tutor availability.' });
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
    await prisma.availability.createMany({
      data: validatedAvailabilities,
    });

    // Return updated availability
    const updatedAvailabilities = await prisma.availability.findMany({
      where: { tutorId: tutorProfile.id },
    });

    res.json({ availability: updatedAvailabilities });
  } catch (error) {
    console.error('Update availability error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.message.includes('Each availability must have')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

export default router;