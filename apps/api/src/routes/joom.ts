import { Router } from 'express';
import listingsRouter from './joom-listings';
import operationsRouter from './joom-operations';

const router = Router();
router.use('/', listingsRouter);
router.use('/', operationsRouter);

export default router;
