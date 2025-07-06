import { Response, Router } from "express";
import { asyncHandler, AuthenticatedRequest, hasRestaurantAccess, requireRole, validateBody, validateParams } from "../middleware";
import { queries, RegisterTableDto, UpdateTableDto, validators } from "@dine-now/database";
import { AccessDeniedError, ApiResponse, BadRequestError, HTTP_STATUS, NotFoundError, Table, TableWithRestaurant } from "@dine-now/shared";
import { logInfo } from "../utils/logger";

const router: Router = Router();

/**
 * @swagger
 * /api/restaurants/table/{tableId}:
 *   get:
 *     summary: Get table and restaurant info
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: tableId
 *         required: true
 *         schema:
 *           type: string
 *         description: Table ID
 *     responses:
 *       200:
 *         description: Table and restaurant information
 *       404:
 *         description: Table not found or inactive
 */
router.get(
  '/:tableId',
  validateParams(validators.TableParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<TableWithRestaurant>>) => {
    const { tableId } = req.params;
    logInfo('Fetching table by ID', { tableId });

    const table = await queries.table.getTableDetailsById(tableId!);
    if (!table) throw new NotFoundError('Table not found or inactive');

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: table
    });
  })
);

router.post(
  '/',
  validateBody(validators.RegisterTable),
  requireRole(['admin', 'manager']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<Table>>) => {
    const { restaurantId, number } = req.body as RegisterTableDto;
    logInfo('Create new table for restaurant', { restaurantId, number });
    
    if (!hasRestaurantAccess(req, restaurantId)) throw new AccessDeniedError('No restaurant access');

    const table = await queries.table.registerTable(req.body);
    if (!table) throw new BadRequestError('No table has been created');

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: table
    });
  })
);

router.put(
  '/:tableId',
  validateParams(validators.TableParams),
  validateBody(validators.UpdateTable),
  requireRole(['admin', 'manager']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<Table>>) => {
    const { tableId } = req.params;
    logInfo('Updating table info', { tableId });

    const table = await queries.table.getTableById(tableId!);
    if (!table) throw new NotFoundError('Table not found');
    if (!hasRestaurantAccess(req, table.restaurantId)) throw new AccessDeniedError('No restaurant access');

    const updated = await queries.table.updateTable(tableId!, req.body as UpdateTableDto);
    if (!updated) throw new NotFoundError('Table not found or can not updated');

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: updated
    });
  })
);

router.patch(
  '/:tableId',
  validateParams(validators.TableParams),
  requireRole(['admin', 'manager']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<Table>>) => {
    const { tableId } = req.params;

    const table = await queries.table.getTableById(tableId!);
    if (!table) throw new NotFoundError('Table not found');
    if (!hasRestaurantAccess(req, table.restaurantId)) throw new AccessDeniedError('No restaurant access');

    logInfo(`${table.isActive ? 'Deactivating' : 'Activating'} restaurant table`, { tableId, restaurantId: table.restaurantId });
    const toggled = await queries.table.toggleTable(table.id);
    if (!toggled) throw new BadRequestError();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: toggled
    });
  })
);

export default router;
