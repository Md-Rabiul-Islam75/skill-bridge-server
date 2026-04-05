import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import tutorRoutes from './routes/tutors.js';
import tutorPrivateRoutes from './routes/tutor.js';
import bookingRoutes from './routes/bookings.js';
import reviewRoutes from './routes/reviews.js';
import adminRoutes from './routes/admin.js';
dotenv.config();
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;
// Middleware
const allowedOrigins = [
    'http://localhost:3000',
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL,
].filter(Boolean);
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin))
            return callback(null, true);
        if (origin.endsWith('.vercel.app'))
            return callback(null, true);
        return callback(new Error('CORS not allowed'));
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
};
app.use(cors(corsOptions));
app.use((req, res, next) => {
    const reqOrigin = req.headers.origin;
    if (reqOrigin && (allowedOrigins.includes(reqOrigin) || reqOrigin.endsWith('.vercel.app'))) {
        res.header('Access-Control-Allow-Origin', reqOrigin);
    }
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    next();
});
app.use(express.json());
// Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name, role } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: role || 'STUDENT',
            },
        });
        res.status(201).json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error('Auth register error:', error instanceof Error ? error.message : String(error));
        res.status(500).json({ error: 'Registration failed' });
    }
});
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const user = await prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error('Auth login error:', error instanceof Error ? error.message : String(error));
        res.status(500).json({ error: 'Login failed' });
    }
});
app.get('/api/auth/me', async (req, res) => {
    try {
        // Lightweight fallback auth for this assignment:
        // identify current user using ?userId=... or x-user-id header.
        const userId = req.query.userId || req.header('x-user-id');
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: missing userId' });
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        return res.json({ user });
    }
    catch (error) {
        console.error('Auth me error:', error instanceof Error ? error.message : String(error));
        return res.status(500).json({ error: 'Failed to fetch current user' });
    }
});
app.post('/api/auth/logout', (_req, res) => {
    return res.json({ success: true, message: 'Logged out' });
});
app.use('/api/tutors', tutorRoutes);
app.use('/api/tutor', tutorPrivateRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
// Custom registration endpoint (separate from auth routes)
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, name, role } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: role || 'STUDENT',
            },
        });
        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});
// Root page
app.get('/', (req, res) => {
    res.send(`
    <html>
      <head><title>Skill Bridge API</title></head>
      <body>
        <h1>Skill Bridge Server</h1>
        <p>The API is running. Use the following endpoints:</p>
        <ul>
          <li>POST /api/auth/register</li>
          <li>POST /api/auth/login</li>
          <li>GET /api/auth/me</li>
          <li>POST /api/auth/logout</li>
          <li>GET /api/tutors</li>
          <li>GET /api/tutors/categories</li>
          <li>GET /api/tutors/:id</li>
          <li>PUT /api/tutor/profile</li>
          <li>PUT /api/tutor/availability</li>
          <li>POST /api/bookings</li>
          <li>GET /api/bookings</li>
          <li>GET /api/bookings/:id</li>
          <li>PATCH /api/bookings/:id</li>
          <li>POST /api/reviews</li>
          <li>GET /api/admin/users</li>
          <li>PATCH /api/admin/users/:id</li>
          <li>GET /api/admin/bookings</li>
        </ul>
      </body>
    </html>
  `);
});
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}
export default app;
//# sourceMappingURL=index.js.map