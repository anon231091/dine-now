import { Router } from 'express';
import { notFoundHandler } from '../middleware';
import authRoutes from './auth';
import restaurantRoutes from './restaurants';
import menuRoutes from './menu';
import orderRoutes from './orders';
import staffRoutes from './staff';
import kitchenRoutes from './kitchen';

const router: Router = Router();

// Mount all routes
router.use('/auth', authRoutes);
router.use('/restaurants', restaurantRoutes);
router.use('/menu', menuRoutes);
router.use('/orders', orderRoutes);
router.use('/staff', staffRoutes);
router.use('/kitchen', kitchenRoutes);

// NOTE: ALWAYS place not found handler at very bottom of the stack
// see more: https://expressjs.com/en/starter/faq.html#how-do-i-handle-404-responses
//
// 404 handler for API routes
router.use(notFoundHandler);

export default router;
