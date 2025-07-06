import { Router, Response } from 'express';
import { queries, validators } from '@dine-now/database';
import {
  AccessDeniedError, ApiResponse, BadRequestError, HTTP_STATUS, ID,
  NotFoundError, Staff, StaffRole, StaffWithRestaurant, TelegramGroup,
  TelegramGroupWithRestaurant,
} from '@dine-now/shared';
import type {
  RegisterStaffDto,
  RegisterTelegramGroupDto,
  UpdateStaffDto,
  UpdateTelegramGroupDto,
} from '@dine-now/database';

import {
  asyncHandler, AuthenticatedRequest, hasRestaurantAccess, hasRoleIn,
  isSuperAdmin, requireRole, validateBody, validateParams
} from '../middleware';
import { logInfo } from '../utils/logger';

const staffRoutes: Router = Router();

staffRoutes.get(
  '/:telegramId',
  validateParams(validators.TelegramIdParams),
  requireRole(['admin', 'manager']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<Staff>>) => {
    const { telegramId } = req.params;
    logInfo('Fetching staff info', { telegramId });

    const staff = await queries.staff.getStaffByTelegramId(BigInt(telegramId!));
    if (!staff) throw new NotFoundError('Staff not found');
    if (!hasRestaurantAccess(req, staff.restaurantId)) throw new AccessDeniedError('No restaurant access');

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: staff
    })
  })
)

staffRoutes.get(
  '/:telegramId/details',
  validateParams(validators.TelegramIdParams),
  requireRole(['admin', 'manager']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<StaffWithRestaurant>>) => {
    const { telegramId } = req.params;
    logInfo('Fetching staff details', { telegramId });

    const staff = await queries.staff.getStaffDetailsByTelegramId(BigInt(telegramId!));
    if (!staff) throw new NotFoundError('Staff not found');
    if (!hasRestaurantAccess(req, staff.restaurantId)) throw new AccessDeniedError('No restaurant access');

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: staff
    })
  })
)

staffRoutes.post(
  '/',
  validateBody(validators.RegisterStaff),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<Staff>>) => {
    const { restaurantId, role } = req.body as RegisterStaffDto;
    logInfo('Creating new staff member', { restaurantId, role });

    // validate if user has sufficient permission
    validateStaffManagementAccess(req, restaurantId, role);

    const staff = await queries.staff.registerStaff(req.body);
    if (!staff) throw new BadRequestError('No staff has been created');

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: staff
    })
  })
)

staffRoutes.put(
  '/:staffId',
  validateParams(validators.StaffParams),
  validateBody(validators.UpdateStaff),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<Staff>>) => {
    const { staffId } = req.params;
    const { role, telegramId } = req.body as UpdateStaffDto;
    logInfo('Updating staff info', { telegramId, role });

    const staff = await queries.staff.getStaffById(staffId!);
    if (!staff) throw new NotFoundError('Staff not found');

    // validate if user has sufficient permission
    validateStaffManagementAccess(req, staff.restaurantId, role);

    const updated = await queries.staff.updateStaff(staff.id, req.body);
    if (!updated) throw new BadRequestError('Staff has not been updated');

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: updated
    })
  })
)

staffRoutes.patch(
  '/:staffId/toggle',
  validateParams(validators.StaffParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<Staff>>) => {
    const { staffId } = req.params;

    const staff = await queries.staff.getStaffById(staffId!);
    if (!staff) throw new NotFoundError('Staff not found');

    // validate if user has sufficient permission
    validateStaffManagementAccess(req, staff.restaurantId, staff.role);
    logInfo(`${staff.isActive ? 'Deactivating' : 'Activating'} staff member`, { staffId });

    const toggled = await queries.staff.toggleStaff(staff.id);
    if (!toggled) throw new BadRequestError();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: toggled
    })
  })
)

const validateStaffManagementAccess = (req: AuthenticatedRequest, restaurantId: ID, role?: StaffRole) => {
  if (role === 'admin' && !isSuperAdmin(req)) throw new AccessDeniedError();
  else if (!hasRestaurantAccess(req, restaurantId) || !hasRoleIn(req, ['admin', 'manager'])) {
    throw new AccessDeniedError('No restaurant access or no permission')
  };
}

const tgRoutes: Router = Router();

tgRoutes.post(
  '/',
  validateBody(validators.RegisterTelegramGroup),
  requireRole(['admin']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<TelegramGroup>>) => {
    const { restaurantId, chatId, groupType } = req.body as RegisterTelegramGroupDto;
    logInfo('Registering telegram group', { restaurantId, groupType });

    if (!hasRestaurantAccess(req, restaurantId)) throw new AccessDeniedError('No restaurant access');

    // Check if group type for this restaurant already exist
    const restaurant = await queries.telegramGroup.getGroupsByRestaurant(restaurantId);
    if (!restaurant) throw new NotFoundError('Restaurant not found');
    if (restaurant.groups.find(group => group.groupType === groupType)) throw new BadRequestError('This group type already exists');

    const registered = await queries.telegramGroup.registerGroup({ restaurantId, chatId, groupType });
    if (!registered) throw new BadRequestError('No telegram group has been registered');

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: registered
    })
  })
)

tgRoutes.put(
  '/:groupId',
  validateParams(validators.TelegramGroupParams),
  validateBody(validators.UpdateTelegramGroup),
  requireRole(['admin']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<TelegramGroup>>) => {
    const { groupId } = req.params;
    const { groupType } = req.body as UpdateTelegramGroupDto;
    logInfo('Updating telegram group info', { groupId, groupType });

    const group = await queries.telegramGroup.getGroupById(groupId!);
    if (!group) throw new NotFoundError('Telegram group not found');

    if (!hasRestaurantAccess(req, group.restaurantId)) throw new AccessDeniedError('No restaurant access');

    // If wanna update `groupType`, check if group type for this restaurant already exist
    if (groupType || groupType !== group.groupType) {
      const restaurant = await queries.telegramGroup.getGroupsByRestaurant(group.restaurantId);
      if (!restaurant) throw new NotFoundError('Restaurant not found');
      if (restaurant.groups.find(g => g.groupType === groupType)) throw new BadRequestError('This group type already exists');
    }

    const updated = await queries.telegramGroup.updateGroup(groupId!, req.body);
    if (!updated) throw new BadRequestError('The group has not been updated');

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: updated
    })
  })
)

tgRoutes.patch(
  '/:groupId/toggle',
  validateParams(validators.TelegramGroupParams),
  requireRole(['admin']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<TelegramGroup>>) => {
    const { groupId } = req.params;

    const group = await queries.telegramGroup.getGroupById(groupId!);
    if (!group) throw new NotFoundError('Telegram group not found');

    if (!hasRestaurantAccess(req, group.restaurantId)) throw new AccessDeniedError('No restaurant access');
    logInfo(`${group.isActive ? 'Deactivating' : 'Activating'} telegram group`, { groupId });

    const toggled = await queries.telegramGroup.toggleGroup(groupId!);
    if (!toggled) throw new BadRequestError();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: toggled
    })
  })
)

tgRoutes.get(
  '/:telegramId',
  validateParams(validators.TelegramIdParams),
  requireRole(['admin', 'manager']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<TelegramGroupWithRestaurant>>) => {
    const { telegramId } = req.params;
    logInfo('Fetching telegram group by chat ID', { telegramId });

    const group = await queries.telegramGroup.getGroupByChatId(BigInt(telegramId!));
    if (!group) throw new NotFoundError('Telegram group not found');
    if (!hasRestaurantAccess(req, group.restaurantId)) throw new AccessDeniedError('No restaurant access');

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: group
    })
  })
)

const router: Router = Router();

router.use('/staff', staffRoutes);
router.use('/telegram_group', tgRoutes);

export default router;
