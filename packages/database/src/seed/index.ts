import { getDatabase } from '../config';
import * as schema from '../schema';
import { eq } from 'drizzle-orm';

// Sample data for seeding
const sampleData = {
  restaurants: [
    {
      name: 'Khmer Kitchen',
      nameKh: 'ផ្ទះបាយខ្មែរ',
      description: 'Authentic Cambodian cuisine with modern twist',
      descriptionKh: 'អាហារខ្មែរប្រពៃណីជាមួយនឹងការកែប្រែទំនើប',
      address: '123 Street 51, Daun Penh, Phnom Penh',
      phoneNumber: '+855 12 345 678',
    },
    {
      name: 'Mekong Cafe',
      nameKh: 'កាហ្វេមេគង្គ',
      description: 'Riverside dining with international and local dishes',
      descriptionKh: 'ភោជនីយដ្ឋានមាត់ទន្លេជាមួយនឹងម្ហូបអន្តរជាតិនិងក្នុងស្រុក',
      address: '456 Sisowath Quay, Phnom Penh',
      phoneNumber: '+855 23 987 654',
    }
  ],

  menuCategories: [
    // Khmer Kitchen categories
    {
      name: 'Appetizers',
      nameKh: 'ម្ហូបកាត់ដំណើរ',
      description: 'Traditional Cambodian starters',
      descriptionKh: 'ម្ហូបបើកចំណង់ប្រពៃណីខ្មែរ',
    },
    {
      name: 'Main Dishes',
      nameKh: 'ម្ហូបធំ',
      description: 'Authentic Khmer main courses',
      descriptionKh: 'ម្ហូបធំខ្មែរដើម',
    },
    {
      name: 'Desserts',
      nameKh: 'បង្អែម',
      description: 'Traditional Cambodian sweets',
      descriptionKh: 'បង្អែមប្រពៃណីកម្ពុជា',
    },
    {
      name: 'Beverages',
      nameKh: 'ភេសជ្ជៈ',
      description: 'Local and international drinks',
      descriptionKh: 'ភេសជ្ជៈក្នុងស្រុកនិងអន្តរជាតិ',
    },
    // Mekong Cafe categories
    {
      name: 'Western Food',
      nameKh: 'អាហារលោកខាងលិច',
      description: 'International cuisine favorites',
      descriptionKh: 'អាហារអន្តរជាតិដែលពេញនិយម',
    },
    {
      name: 'Asian Fusion',
      nameKh: 'អាហារអាស៊ីបញ្ចូលគ្នា',
      description: 'Modern Asian fusion dishes',
      descriptionKh: 'ម្ហូបអាស៊ីបញ្ចូលគ្នាទំនើប',
    }
  ],

  menuItems: [
    // Appetizers - Khmer Kitchen
    {
      name: 'Fresh Spring Rolls',
      nameKh: 'នំបញ្ចុកសាច់',
      description: 'Fresh vegetables and herbs wrapped in rice paper, served with peanut sauce',
      descriptionKh: 'បន្លែស្រស់និងស្លឹកជីរុំក្នុងកាកេតបាយ បញ្ជាជាមួយទឹកជ្រលក់សណ្តែកដី',
      price: '4.50',
      preparationTimeMinutes: 10,
    },
    {
      name: 'Cambodian Fish Cakes',
      nameKh: 'នំត្រីចៀន',
      description: 'Deep-fried fish cakes with cucumber relish',
      descriptionKh: 'នំត្រីចៀនក្រុបជាមួយត្រសក់ជូរ',
      price: '6.00',
      preparationTimeMinutes: 15,
    },
    
    // Main Dishes - Khmer Kitchen
    {
      name: 'Amok Trey',
      nameKh: 'អាម៉ុកត្រី',
      description: 'Traditional steamed fish curry in banana leaf',
      descriptionKh: 'ការីត្រីចំហុយដាក់ស្លឹកចេកប្រពៃណី',
      price: '12.00',
      preparationTimeMinutes: 25,
    },
    {
      name: 'Beef Lok Lak',
      nameKh: 'លុកឡាក់សាច់គោ',
      description: 'Cambodian-style stir-fried beef with lime pepper sauce',
      descriptionKh: 'សាច់គោឆាបែបខ្មែរជាមួយទឹកជ្រលក់ម្រេចក្រូច',
      price: '15.00',
      preparationTimeMinutes: 20,
    },
    {
      name: 'Khmer Red Curry',
      nameKh: 'ក្រមុំខ្មែរ',
      description: 'Rich coconut curry with chicken and vegetables',
      descriptionKh: 'ក្រមុំទឹកដូងមាន់និងបន្លែ',
      price: '13.50',
      preparationTimeMinutes: 30,
    },

    // Desserts - Khmer Kitchen  
    {
      name: 'Num Ansom',
      nameKh: 'នំអន្សម',
      description: 'Traditional sticky rice cake with banana',
      descriptionKh: 'នំអន្សមបាយដំណើបប្រពៃណីជាមួយចេក',
      price: '3.50',
      preparationTimeMinutes: 5,
    },
    {
      name: 'Baked Custard',
      nameKh: 'សង់ខ្យាដុត',
      description: 'Cambodian-style baked custard with palm sugar',
      descriptionKh: 'សង់ខ្យាដុតបែបខ្មែរជាមួយស្ករត្នោត',
      price: '4.00',
      preparationTimeMinutes: 8,
    },

    // Beverages - Both restaurants
    {
      name: 'Iced Coffee',
      nameKh: 'កាហ្វេទឹកកក',
      description: 'Traditional Cambodian iced coffee with condensed milk',
      descriptionKh: 'កាហ្វេទឹកកកខ្មែរប្រពៃណីជាមួយទឹកដោះកោ',
      price: '2.50',
      preparationTimeMinutes: 5,
    },
    {
      name: 'Sugar Cane Juice',
      nameKh: 'ទឹកអំពៅ',
      description: 'Fresh sugar cane juice with ice',
      descriptionKh: 'ទឹកអំពៅស្រស់ជាមួយទឹកកក',
      price: '2.00',
      preparationTimeMinutes: 3,
    },

    // Western Food - Mekong Cafe
    {
      name: 'Grilled Salmon',
      nameKh: 'ត្រីសាលម៉ុនអាំង',
      description: 'Grilled salmon with herbs and lemon butter sauce',
      descriptionKh: 'ត្រីសាលម៉ុនអាំងជាមួយស្លឹកជីរនិងទឹកជ្រលក់ប៊ឺ',
      price: '18.00',
      preparationTimeMinutes: 20,
    },
    {
      name: 'Chicken Burger',
      nameKh: 'ប៊ឺហ្គ័រមាន់',
      description: 'Grilled chicken burger with fries',
      descriptionKh: 'ប៊ឺហ្គ័រមាន់អាំងជាមួយដំឡូងបំពង',
      price: '8.50',
      preparationTimeMinutes: 15,
    },

    // Asian Fusion - Mekong Cafe
    {
      name: 'Pad Thai',
      nameKh: 'ផេតថៃ',
      description: 'Thai-style stir-fried noodles with shrimp',
      descriptionKh: 'មីឆាបែបថៃជាមួយបង្គា',
      price: '11.00',
      preparationTimeMinutes: 18,
    },
    {
      name: 'Vietnamese Pho',
      nameKh: 'ស៊ុបភូ',
      description: 'Vietnamese beef noodle soup with herbs',
      descriptionKh: 'ស៊ុបមីសាច់គោវៀតណាមជាមួយស្លឹកជីរ',
      price: '9.50',
      preparationTimeMinutes: 22,
    }
  ],

  staff: [
    // Khmer Kitchen staff
    {
      telegramId: BigInt('111222333'),
      firstName: 'Pich',
      lastName: 'Sokha',
      username: 'pich_kitchen',
      role: 'admin' as const,
    },
    {
      telegramId: BigInt('444555666'),
      firstName: 'Channa',
      lastName: 'Vuth',
      username: 'channa_chef',
      role: 'kitchen' as const,
    },
    {
      telegramId: BigInt('777888999'),
      firstName: 'Dara',
      lastName: 'Seng',
      username: 'dara_service',
      role: 'service' as const,
    },
    // Mekong Cafe staff
    {
      telegramId: BigInt('111333555'),
      firstName: 'John',
      lastName: 'Wilson',
      username: 'john_manager',
      role: 'manager' as const,
    },
    {
      telegramId: BigInt('222444666'),
      firstName: 'Kimheng',
      lastName: 'Ouk',
      username: 'kimheng_kitchen',
      role: 'kitchen' as const,
    }
  ],

  // Sample Telegram customer IDs for creating sample orders
  sampleCustomers: [
    {
      telegramId: BigInt('123456789'),
      name: 'Sophea Chan'
    },
    {
      telegramId: BigInt('987654321'),
      name: 'David Smith'
    },
    {
      telegramId: BigInt('555666777'),
      name: 'Sreypov Kem'
    }
  ]
};

// Seeding functions
export const seedRestaurants = async () => {
  const db = getDatabase();
  
  console.log('🏢 Seeding restaurants...');
  
  const insertedRestaurants = await db
    .insert(schema.restaurants)
    .values(sampleData.restaurants)
    .returning();
    
  console.log(`✅ Inserted ${insertedRestaurants.length} restaurants`);
  return insertedRestaurants;
};

export const seedTables = async (restaurants: any[]) => {
  const db = getDatabase();
  
  console.log('🪑 Seeding tables...');
  
  const tables: any[] = [];
  
  // Create tables for each restaurant
  for (const restaurant of restaurants) {
    for (let i = 1; i <= 10; i++) {
      tables.push({
        restaurantId: restaurant.id,
        number: i.toString().padStart(2, '0'),
        qrCode: `QR-${restaurant.id}-${i}-${Date.now()}`,
      });
    }
  }
  
  const insertedTables = await db
    .insert(schema.tables)
    .values(tables)
    .returning();
    
  console.log(`✅ Inserted ${insertedTables.length} tables`);
  return insertedTables;
};

export const seedStaff = async (restaurants: any[]) => {
  const db = getDatabase();
  
  console.log('👨‍💼 Seeding staff...');
  
  const staff = sampleData.staff.map((staffMember, index) => ({
    ...staffMember,
    restaurantId: restaurants[index < 3 ? 0 : 1].id, // First 3 to restaurant 1, rest to restaurant 2
  }));
  
  const insertedStaff = await db
    .insert(schema.staff)
    .values(staff)
    .returning();
    
  console.log(`✅ Inserted ${insertedStaff.length} staff members`);
  return insertedStaff;
};

export const seedMenuCategories = async (restaurants: any[]) => {
  const db = getDatabase();
  
  console.log('📋 Seeding menu categories...');
  
  const categories = sampleData.menuCategories.map((category, index) => ({
    ...category,
    restaurantId: restaurants[index < 4 ? 0 : 1].id, // First 4 categories to restaurant 1, rest to restaurant 2
    sortOrder: (index % 4) + 1,
  }));
  
  const insertedCategories = await db
    .insert(schema.menuCategories)
    .values(categories)
    .returning();
    
  console.log(`✅ Inserted ${insertedCategories.length} menu categories`);
  return insertedCategories;
};

export const seedMenuItems = async (restaurants: any[], categories: any[]) => {
  const db = getDatabase();
  
  console.log('🍽️ Seeding menu items...');
  
  // Map items to categories and restaurants
  const menuItemsWithIds = sampleData.menuItems.map((item, index) => {
    let categoryIndex, restaurantIndex;
    
    // Distribute items across categories
    if (index < 2) { // Appetizers
      categoryIndex = 0;
      restaurantIndex = 0;
    } else if (index < 5) { // Main Dishes  
      categoryIndex = 1;
      restaurantIndex = 0;
    } else if (index < 7) { // Desserts
      categoryIndex = 2;
      restaurantIndex = 0;
    } else if (index < 9) { // Beverages (for both restaurants)
      categoryIndex = 3;
      restaurantIndex = index === 7 ? 0 : 1;
    } else if (index < 11) { // Western Food
      categoryIndex = 4;
      restaurantIndex = 1;
    } else { // Asian Fusion
      categoryIndex = 5;
      restaurantIndex = 1;
    }
    
    return {
      ...item,
      categoryId: categories[categoryIndex]?.id,
      restaurantId: restaurants[restaurantIndex]?.id,
      sortOrder: (index % 4) + 1,
    };
  }).filter(item => item.categoryId && item.restaurantId); // Filter out items without valid IDs
  
  const insertedItems = await db
    .insert(schema.menuItems)
    .values(menuItemsWithIds)
    .returning();
    
  console.log(`✅ Inserted ${insertedItems.length} menu items`);
  return insertedItems;
};

export const seedKitchenLoads = async (restaurants: any[]) => {
  const db = getDatabase();
  
  console.log('👨‍🍳 Seeding kitchen loads...');
  
  const kitchenLoads = restaurants.map(restaurant => ({
    restaurantId: restaurant.id,
    currentOrders: Math.floor(Math.random() * 5) + 1, // 1-5 current orders
    averagePreparationTime: Math.floor(Math.random() * 10) + 15, // 15-25 minutes
  }));
  
  const insertedLoads = await db
    .insert(schema.kitchenLoads)
    .values(kitchenLoads)
    .returning();
    
  console.log(`✅ Inserted ${insertedLoads.length} kitchen load records`);
  return insertedLoads;
};

export const seedSampleOrders = async (
  restaurants: any[], 
  tables: any[], 
  menuItems: any[]
) => {
  const db = getDatabase();
  
  console.log('📝 Seeding sample orders...');
  
  const orders = [];
  const orderItems = [];
  
  // Create 5 sample orders using sample customer telegram IDs
  for (let i = 0; i < 5; i++) {
    const customer = sampleData.sampleCustomers[i % sampleData.sampleCustomers.length];
    const restaurant = restaurants[i % restaurants.length];
    const table = tables.find(t => t.restaurantId === restaurant.id);
    const restaurantMenuItems = menuItems.filter(item => item.restaurantId === restaurant.id);
    
    if (!table || restaurantMenuItems.length === 0) continue;
    
    const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now()).slice(-6)}`;
    const status = schema.orderStatusEnum.enumValues.slice(0, 4).at(i % 4);
    
    const order = {
      customerTelegramId: customer!.telegramId,
      customerName: customer!.name,
      restaurantId: restaurant.id,
      tableId: table.id,
      orderNumber,
      status,
      totalAmount: '0', // Will calculate after items
      estimatedPreparationMinutes: 20,
      notes: i === 0 ? 'Please make it less spicy' : undefined,
    };
    
    orders.push(order);
  }
  
  const insertedOrders = await db
    .insert(schema.orders)
    .values(orders)
    .returning();
  
  // Create order items for each order
  for (let i = 0; i < insertedOrders.length; i++) {
    const order = insertedOrders[i]!;
    const restaurantMenuItems = menuItems.filter(item => item.restaurantId === order.restaurantId);
    
    // Add 1-3 items per order
    const numItems = Math.floor(Math.random() * 3) + 1;
    let totalAmount = 0;
    
    for (let j = 0; j < numItems; j++) {
      const menuItem = restaurantMenuItems[j % restaurantMenuItems.length];
      const quantity = Math.floor(Math.random() * 3) + 1;
      const unitPrice = parseFloat(menuItem.price);
      const subtotal = unitPrice * quantity;
      totalAmount += subtotal;
      
      orderItems.push({
        orderId: order.id,
        menuItemId: menuItem.id,
        quantity,
        size: schema.itemSizeEnum.enumValues[Math.floor(Math.random() * 3)],
        spiceLevel: schema.spiceLevelEnum.enumValues[Math.floor(Math.random() * 5)],
        notes: j === 0 && i === 0 ? 'Extra crispy please' : undefined,
        unitPrice: unitPrice.toString(),
        subtotal: subtotal.toString(),
      });
    }
    
    // Update order total
    await db
      .update(schema.orders)
      .set({ totalAmount: totalAmount.toString() })
      .where(eq(schema.orders.id, order.id));
  }
  
  if (orderItems.length > 0) {
    await db
      .insert(schema.orderItems)
      .values(orderItems);
  }
  
  console.log(`✅ Inserted ${insertedOrders.length} orders with ${orderItems.length} order items`);
  return insertedOrders;
};

// Main seed function
export const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Check if data already exists
    const db = getDatabase();
    const existingRestaurants = await db.select().from(schema.restaurants).limit(1);
    
    if (existingRestaurants.length > 0) {
      console.log('⚠️ Database already contains data. Skipping seed.');
      return;
    }
    
    // Seed in order due to foreign key dependencies
    const restaurants = await seedRestaurants();
    const tables = await seedTables(restaurants);
    const staff = await seedStaff(restaurants);
    const categories = await seedMenuCategories(restaurants);
    const menuItems = await seedMenuItems(restaurants, categories);
    const kitchenLoads = await seedKitchenLoads(restaurants);
    const orders = await seedSampleOrders(restaurants, tables, menuItems);
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- ${restaurants.length} restaurants`);
    console.log(`- ${tables.length} tables`);
    console.log(`- ${staff.length} staff members`);
    console.log(`- ${categories.length} menu categories`);
    console.log(`- ${menuItems.length} menu items`);
    console.log(`- ${kitchenLoads.length} kitchen load records`);
    console.log(`- ${orders.length} sample orders`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
};

// Clear database function (for development/testing)
export const clearDatabase = async () => {
  try {
    console.log('🧹 Clearing database...');
    
    const db = getDatabase();
    
    // Delete in reverse order due to foreign keys
    await db.delete(schema.orderItems);
    await db.delete(schema.orders);
    await db.delete(schema.kitchenLoads);
    await db.delete(schema.menuItems);
    await db.delete(schema.menuCategories);
    await db.delete(schema.staff);
    await db.delete(schema.tables);
    await db.delete(schema.restaurants);
    
    console.log('✅ Database cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    throw error;
  }
};

// Reseed database function
export const reseedDatabase = async () => {
  await clearDatabase();
  await seedDatabase();
};

// Export individual seeding functions for testing
export const seedFunctions = {
  seedRestaurants,
  seedTables,
  seedStaff,
  seedMenuCategories,
  seedMenuItems,
  seedKitchenLoads,
  seedSampleOrders,
};

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'seed':
      seedDatabase().then(() => process.exit(0)).catch(() => process.exit(1));
      break;
    case 'clear':
      clearDatabase().then(() => process.exit(0)).catch(() => process.exit(1));
      break;
    case 'reseed':
      reseedDatabase().then(() => process.exit(0)).catch(() => process.exit(1));
      break;
    default:
      console.log('Usage: npm run seed [seed|clear|reseed]');
      process.exit(1);
  }
}
