import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  baseURL: "http://localhost:5000",
  emailAndPassword: {
    enabled: true,
  },
  // Simplify user configuration
  user: {
    fields: {
      role: "role",
      name: "name",
    },
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'STUDENT',
      },
      name: {
        type: 'string',
        required: true,
      },
    },
  },
  socialProviders: {
    // Add if needed
  },
});