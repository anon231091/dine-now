import { Router } from 'express';
import { notFoundHandler } from '../middleware';
import restaurantRoutes from './restaurants';
import menuRoutes from './menu';
import orderRoutes from './orders';
import kitchenRoutes from './kitchen';
import adminRoutes from './admin';

const router: Router = Router();

// Mount all routes
router.use('/admin', adminRoutes);
router.use('/restaurants', restaurantRoutes);
router.use('/menu', menuRoutes);
router.use('/orders', orderRoutes);
router.use('/kitchen', kitchenRoutes);

// NOTE: ALWAYS place not found handler at very bottom of the stack
// see more: https://expressjs.com/en/starter/faq.html#how-do-i-handle-404-responses
//
// 404 handler for API routes
router.use(notFoundHandler);

export default router;
