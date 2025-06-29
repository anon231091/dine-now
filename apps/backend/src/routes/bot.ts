import { Router } from 'express';
import { authServiceMiddleware, validateParams } from '../middleware';
import { queries, validators } from '@dine-now/database';

const router: Router = Router();

// Register telegram group
router.post('/groups', authServiceMiddleware, async (req, res) => {
  const { chatId, restaurantId, name, language } = req.body;
  
  const group = await queries.bot.registerGroup({
    chatId: BigInt(chatId),
    restaurantId,
    name,
    language,
  });
  
  res.json({ success: true, data: group });
});

// Get groups for restaurant
router.get(
  '/groups/:restaurantId',
  authServiceMiddleware,
  validateParams(validators.RestaurantParams),
  async (req, res) => {
  const groups = await queries.bot.getGroupsByRestaurant(req.params.restaurantId!);
  res.json({ success: true, data: groups });
});

export default router;
