import { Router } from 'express';
import authRoutes from './auth';
import restaurantRoutes from './restaurants';
import menuRoutes from './menu';
import orderRoutes from './orders';
import staffRoutes from './staff';
import kitchenRoutes from './kitchen';

const router = Router();

// Mount all routes
router.use('/auth', authRoutes);
router.use('/restaurants', restaurantRoutes);
router.use('/menu', menuRoutes);
router.use('/orders', orderRoutes);
router.use('/staff', staffRoutes);
router.use('/kitchen', kitchenRoutes);

export default router;
