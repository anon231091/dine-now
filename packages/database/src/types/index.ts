import { z } from 'zod/v4';
import { validators } from "../validators";

// Request params types
export type TelegramIdParams = z.infer<typeof validators.TelegramIdParams>;
export type StaffParams = z.infer<typeof validators.StaffParams>;
export type TelegramGroupParams = z.infer<typeof validators.TelegramGroupParams>;
export type RestaurantParams = z.infer<typeof validators.RestaurantParams>;
export type TableParams = z.infer<typeof validators.TableParams>;
export type CategoryParams = z.infer<typeof validators.CategoryParams>;
export type MenuItemParams = z.infer<typeof validators.MenuItemParams>;
export type VariantParams = z.infer<typeof validators.VariantParams>;
export type OrderParams = z.infer<typeof validators.OrderParams>;

export type PaginationQuery = z.infer<typeof validators.Pagination>;

export type RegisterRestaurantDto = z.infer<typeof validators.RegisterRestaurant>;
export type UpdateRestaurantDto = z.infer<typeof validators.UpdateRestaurant>;

export type RegisterTableDto = z.infer<typeof validators.RegisterTable>;
export type UpdateTableDto = z.infer<typeof validators.UpdateTable>;

export type RegisterStaffDto = z.infer<typeof validators.RegisterStaff>;
export type UpdateStaffDto = z.infer<typeof validators.UpdateStaff>;

export type RegisterTelegramGroupDto = z.infer<typeof validators.RegisterTelegramGroup>;
export type UpdateTelegramGroupDto = z.infer<typeof validators.UpdateTelegramGroup>;

export type RegisterMenuCategoryDto = z.infer<typeof validators.RegisterMenuCategory>;
export type UpdateMenuCategoryDto = z.infer<typeof validators.UpdateMenuCategory>;

export type RegisterMenuItemDto = z.infer<typeof validators.RegisterMenuItem>;
export type UpdateMenuItemDto = z.infer<typeof validators.UpdateMenuItem>;

export type RegisterMenuItemVariantDto = z.infer<typeof validators.RegisterMenuItemVariant>;
export type UpdateMenuItemVariantDto = z.infer<typeof validators.UpdateMenuItemVariant>;

export type OrderItemDto = z.infer<typeof validators.OrderItem>;
export type OrderDataDto = z.infer<typeof validators.OrderData>;
export type CreateOrderDto = z.infer<typeof validators.CreateOrder>;
export type UpdateOrderStatusDto = z.infer<typeof validators.UpdateOrderStatus>;

export type StaffQuery = z.infer<typeof validators.StaffQuery>;
export type MenuSearchQuery = z.infer<typeof validators.MenuSearch>;
export type OrderSearchQuery = z.infer<typeof validators.OrderSearch>;
export type AnalyticQuery = z.infer<typeof validators.AnalyticsQuery>;
export type ImageUploadDto = z.infer<typeof validators.ImageUpload>;
