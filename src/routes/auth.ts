import { Router } from 'express';
import { auth } from '../auth';

const router = Router();

// Mount BetterAuth
router.use('/', auth);

// Additional routes if needed

export default router;