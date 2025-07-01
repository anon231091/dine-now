import { getDatabase } from '../config';
import * as schema from '../schema';
import { eq } from 'drizzle-orm';

// Sample data for comprehensive seeding
const sampleData = {
  // 3 different restaurants
  restaurants: [
    {
      name: 'Khmer Kitchen',
      nameKh: 'ផ្ទះបាយខ្មែរ',
      description: 'Authentic Cambodian cuisine with modern presentation',
      descriptionKh: 'អាហារខ្មែរដើមត្រូវតាមបែបបុរាណជាមួយនឹងការបង្ហាញទំនើប',
      address: '123 Street 51, Daun Penh, Phnom Penh',
      phoneNumber: '+855 12 345 678',
    },
    {
      name: 'Mekong Riverside',
      nameKh: 'មាត់ទន្លេមេគង្គ',
      description: 'Riverside dining with international and local fusion',
      descriptionKh: 'ភោជនីយដ្ឋានមាត់ទន្លេជាមួយម្ហូបអន្តរជាតិនិងក្នុងស្រុក',
      address: '456 Sisowath Quay, Phnom Penh',
      phoneNumber: '+855 23 987 654',
    },
    {
      name: 'Siem Reap Garden',
      nameKh: 'សួនសៀមរាប',
      description: 'Traditional Khmer dishes in a garden setting',
      descriptionKh: 'ម្ហូបខ្មែរប្រពៃណីនៅក្នុងបរិយាកាសសួន',
      address: '789 Pub Street, Siem Reap',
      phoneNumber: '+855 63 456 789',
    }
  ],

  // Staff for each restaurant
  staff: [
    // Khmer Kitchen Staff
    {
      telegramId: BigInt('111222333'),
      firstName: 'Sophea',
      lastName: 'Chan',
      username: 'sophea_admin',
      role: 'admin' as const,
      restaurantIndex: 0,
    },
    {
      telegramId: BigInt('444555666'),
      firstName: 'Pisach',
      lastName: 'Ouk',
      username: 'pisach_chef',
      role: 'kitchen' as const,
      restaurantIndex: 0,
    },
    {
      telegramId: BigInt('777888999'),
      firstName: 'Dara',
      lastName: 'Seng',
      username: 'dara_service',
      role: 'service' as const,
      restaurantIndex: 0,
    },
    
    // Mekong Riverside Staff
    {
      telegramId: BigInt('111333555'),
      firstName: 'John',
      lastName: 'Wilson',
      username: 'john_manager',
      role: 'manager' as const,
      restaurantIndex: 1,
    },
    {
      telegramId: BigInt('222444666'),
      firstName: 'Kimheng',
      lastName: 'Pov',
      username: 'kimheng_kitchen',
      role: 'kitchen' as const,
      restaurantIndex: 1,
    },
    {
      telegramId: BigInt('333555777'),
      firstName: 'Sreymom',
      lastName: 'Lim',
      username: 'sreymom_service',
      role: 'service' as const,
      restaurantIndex: 1,
    },

    // Siem Reap Garden Staff
    {
      telegramId: BigInt('444666888'),
      firstName: 'Vibol',
      lastName: 'Khiev',
      username: 'vibol_admin',
      role: 'admin' as const,
      restaurantIndex: 2,
    },
    {
      telegramId: BigInt('555777999'),
      firstName: 'Channary',
      lastName: 'Sok',
      username: 'channary_chef',
      role: 'kitchen' as const,
      restaurantIndex: 2,
    }
  ],

  // Telegram groups for each restaurant
  telegramGroups: [
    // Khmer Kitchen Groups
    {
      chatId: BigInt('-1001234567890'),
      groupType: 'management' as const,
      restaurantIndex: 0,
    },
    {
      chatId: BigInt('-1001234567891'),
      groupType: 'kitchen' as const,
      restaurantIndex: 0,
    },
    {
      chatId: BigInt('-1001234567892'),
      groupType: 'service' as const,
      restaurantIndex: 0,
    },

    // Mekong Riverside Groups
    {
      chatId: BigInt('-1001987654321'),
      groupType: 'management' as const,
      restaurantIndex: 1,
    },
    {
      chatId: BigInt('-1001987654322'),
      groupType: 'kitchen' as const,
      restaurantIndex: 1,
    },

    // Siem Reap Garden Groups
    {
      chatId: BigInt('-1001555666777'),
      groupType: 'management' as const,
      restaurantIndex: 2,
    },
    {
      chatId: BigInt('-1001555666778'),
      groupType: 'kitchen' as const,
      restaurantIndex: 2,
    }
  ],

  // Menu categories for each restaurant
  menuCategories: [
    // Khmer Kitchen Categories
    {
      name: 'Appetizers',
      nameKh: 'ម្ហូបកាត់ដំណើរ',
      description: 'Traditional Cambodian starters',
      descriptionKh: 'ម្ហូបបើកចំណង់ប្រពៃណីខ្មែរ',
      sortOrder: 1,
      restaurantIndex: 0,
    },
    {
      name: 'Soups',
      nameKh: 'ស៊ុប',
      description: 'Traditional Khmer soups',
      descriptionKh: 'ស៊ុបខ្មែរប្រពៃណី',
      sortOrder: 2,
      restaurantIndex: 0,
    },
    {
      name: 'Main Dishes',
      nameKh: 'ម្ហូបធំ',
      description: 'Authentic Khmer main courses',
      descriptionKh: 'ម្ហូបធំខ្មែរដើម',
      sortOrder: 3,
      restaurantIndex: 0,
    },
    {
      name: 'Rice & Noodles',
      nameKh: 'បាយនិងមី',
      description: 'Rice and noodle dishes',
      descriptionKh: 'ម្ហូបបាយនិងមី',
      sortOrder: 4,
      restaurantIndex: 0,
    },
    {
      name: 'Desserts',
      nameKh: 'បង្អែម',
      description: 'Traditional sweets',
      descriptionKh: 'បង្អែមប្រពៃណី',
      sortOrder: 5,
      restaurantIndex: 0,
    },
    {
      name: 'Beverages',
      nameKh: 'ភេសជ្ជៈ',
      description: 'Local and international drinks',
      descriptionKh: 'ភេសជ្ជៈក្នុងស្រុកនិងអន្តរជាតិ',
      sortOrder: 6,
      restaurantIndex: 0,
    },

    // Mekong Riverside Categories
    {
      name: 'Western Appetizers',
      nameKh: 'ម្ហូបកាត់ដំណើរលោកខាងលិច',
      description: 'International starters',
      descriptionKh: 'ម្ហូបបើកចំណង់អន្តរជាតិ',
      sortOrder: 1,
      restaurantIndex: 1,
    },
    {
      name: 'Asian Fusion',
      nameKh: 'អាហារអាស៊ីបញ្ចូលគ្នា',
      description: 'Modern Asian fusion dishes',
      descriptionKh: 'ម្ហូបអាស៊ីបញ្ចូលគ្នាទំនើប',
      sortOrder: 2,
      restaurantIndex: 1,
    },
    {
      name: 'Seafood',
      nameKh: 'អាហារសមុទ្រ',
      description: 'Fresh seafood specialties',
      descriptionKh: 'អាហារសមុទ្រស្រស់ពិសេស',
      sortOrder: 3,
      restaurantIndex: 1,
    },
    {
      name: 'Beverages',
      nameKh: 'ភេសជ្ជៈ',
      description: 'Cocktails and drinks',
      descriptionKh: 'កុកតែលនិងភេសជ្ជៈ',
      sortOrder: 4,
      restaurantIndex: 1,
    },

    // Siem Reap Garden Categories
    {
      name: 'Garden Salads',
      nameKh: 'សាឡាត់សួន',
      description: 'Fresh garden salads',
      descriptionKh: 'សាឡាត់សួនស្រស់',
      sortOrder: 1,
      restaurantIndex: 2,
    },
    {
      name: 'Traditional Khmer',
      nameKh: 'ខ្មែរប្រពៃណី',
      description: 'Heritage Cambodian recipes',
      descriptionKh: 'រូបមន្តអាហារខ្មែរបេតិកភណ្ឌ',
      sortOrder: 2,
      restaurantIndex: 2,
    },
    {
      name: 'Grilled Specialties',
      nameKh: 'ម្ហូបអាំងពិសេស',
      description: 'Garden grilled dishes',
      descriptionKh: 'ម្ហូបអាំងក្នុងសួន',
      sortOrder: 3,
      restaurantIndex: 2,
    }
  ],

  // Menu items with detailed descriptions
  menuItems: [
    // Khmer Kitchen Items
    {
      name: 'Fresh Spring Rolls',
      nameKh: 'នំបញ្ចុកសាច់ស្រស់',
      description: 'Fresh vegetables, herbs, and shrimp wrapped in rice paper, served with peanut dipping sauce',
      descriptionKh: 'បន្លែស្រស់ ស្លឹកជីរ និងបង្គារុំក្នុងកាកេតបាយ បរិភោគជាមួយទឹកជ្រលក់សណ្តែកដី',
      preparationTimeMinutes: 8,
      categoryIndex: 0, // Appetizers
      restaurantIndex: 0,
      sortOrder: 1,
    },
    {
      name: 'Fish Amok',
      nameKh: 'អាម៉ុកត្រី',
      description: 'Traditional steamed fish curry in banana leaf with coconut milk and kroeung paste',
      descriptionKh: 'ការីត្រីចំហុយប្រពៃណីដាក់ស្លឹកចេកជាមួយទឹកដូងនិងគ្រឿងអាម៉ុក',
      preparationTimeMinutes: 25,
      categoryIndex: 2, // Main Dishes
      restaurantIndex: 0,
      sortOrder: 1,
    },
    {
      name: 'Beef Lok Lak',
      nameKh: 'លុកឡាក់សាច់គោ',
      description: 'Cambodian-style stir-fried beef cubes with lime pepper sauce, served with rice',
      descriptionKh: 'សាច់គោកូនភ្លោះឆាបែបខ្មែរជាមួយទឹកជ្រលក់ម្រេចក្រូច បរិភោគជាមួយបាយ',
      preparationTimeMinutes: 15,
      categoryIndex: 2, // Main Dishes
      restaurantIndex: 0,
      sortOrder: 2,
    },
    {
      name: 'Khmer Red Curry',
      nameKh: 'ក្រមុំខ្មែរ',
      description: 'Rich coconut curry with chicken, eggplant, and green beans',
      descriptionKh: 'ក្រមុំទឹកដូងជាមួយសាច់មាន់ ត្រសក់ និងសណ្តែកបារាំង',
      preparationTimeMinutes: 20,
      categoryIndex: 2, // Main Dishes
      restaurantIndex: 0,
      sortOrder: 3,
    },
    {
      name: 'Pho Khmer',
      nameKh: 'គុយទាវ',
      description: 'Cambodian rice noodle soup with beef broth and herbs',
      descriptionKh: 'ស៊ុបមីកុយទាវជាមួយសាច់គោនិងស្លឹកជីរ',
      preparationTimeMinutes: 12,
      categoryIndex: 3, // Rice & Noodles
      restaurantIndex: 0,
      sortOrder: 1,
    },
    {
      name: 'Iced Coffee',
      nameKh: 'កាហ្វេទឹកកក',
      description: 'Traditional Cambodian iced coffee with condensed milk',
      descriptionKh: 'កាហ្វេទឹកកកខ្មែរប្រពៃណីជាមួយទឹកដោះកោ',
      preparationTimeMinutes: 3,
      categoryIndex: 5, // Beverages
      restaurantIndex: 0,
      sortOrder: 1,
    },

    // Mekong Riverside Items
    {
      name: 'Grilled Prawns',
      nameKh: 'បង្គាអាំង',
      description: 'Fresh Mekong prawns grilled with herbs and garlic butter',
      descriptionKh: 'បង្គាមេគង្គស្រស់អាំងជាមួយស្លឹកជីរនិងប៊ឺខ្ទឹម',
      preparationTimeMinutes: 18,
      categoryIndex: 8, // Seafood
      restaurantIndex: 1,
      sortOrder: 1,
    },
    {
      name: 'Tom Yum Fusion',
      nameKh: 'ទំយំបញ្ចូលគ្នា',
      description: 'Thai-Khmer fusion soup with local river fish and herbs',
      descriptionKh: 'ស៊ុបថៃ-ខ្មែរបញ្ចូលគ្នាជាមួយត្រីទន្លេនិងស្លឹកជីរ',
      preparationTimeMinutes: 15,
      categoryIndex: 7, // Asian Fusion
      restaurantIndex: 1,
      sortOrder: 1,
    },
    {
      name: 'Mango Sticky Rice',
      nameKh: 'ខាវអំពៅ',
      description: 'Sweet sticky rice with fresh mango and coconut cream',
      descriptionKh: 'បាយដំណើបផ្អែមជាមួយស្វាយស្រស់និងក្រមទឹកដូង',
      preparationTimeMinutes: 10,
      categoryIndex: 9, // Beverages (dessert drinks)
      restaurantIndex: 1,
      sortOrder: 2,
    },

    // Siem Reap Garden Items
    {
      name: 'Garden Fresh Salad',
      nameKh: 'សាឡាត់សួនស្រស់',
      description: 'Mixed organic greens with garden herbs and lime dressing',
      descriptionKh: 'បន្លែបៃតងចម្រុះធម្មជាតិជាមួយស្លឹកជីរសួននិងទឹកជ្រលក់ក្រូចឆ្មារ',
      preparationTimeMinutes: 5,
      categoryIndex: 10, // Garden Salads
      restaurantIndex: 2,
      sortOrder: 1,
    },
    {
      name: 'Heritage Amok',
      nameKh: 'អាម៉ុកបេតិកភណ្ឌ',
      description: 'Traditional recipe amok passed down through generations',
      descriptionKh: 'រូបមន្តអាម៉ុកប្រពៃណីបានបក់បន្តពីជំនាន់មុន',
      preparationTimeMinutes: 30,
      categoryIndex: 11, // Traditional Khmer
      restaurantIndex: 2,
      sortOrder: 1,
    }
  ],

  // Base prices for calculating variants
  basePrices: [
    6.50,  // Fresh Spring Rolls
    15.00, // Fish Amok
    18.00, // Beef Lok Lak
    14.50, // Khmer Red Curry
    8.50,  // Pho Khmer
    3.50,  // Iced Coffee
    22.00, // Grilled Prawns
    12.00, // Tom Yum Fusion
    7.50,  // Mango Sticky Rice
    9.50,  // Garden Fresh Salad
    16.50, // Heritage Amok
  ],

  // Variant templates with Khmer names
  variantTemplates: [
    {
      size: 'small' as const,
      name: 'Small',
      nameKh: 'តូច',
      priceMultiplier: 0.75,
      isDefault: false,
      sortOrder: 1,
    },
    {
      size: 'regular' as const,
      name: 'Regular',
      nameKh: 'ធម្មតា',
      priceMultiplier: 1.0,
      isDefault: true,
      sortOrder: 2,
    },
    {
      size: 'large' as const,
      name: 'Large',
      nameKh: 'ធំ',
      priceMultiplier: 1.35,
      isDefault: false,
      sortOrder: 3,
    }
  ],

  // Sample customers (telegram IDs and names)
  sampleCustomers: [
    {
      telegramId: BigInt('123456789'),
      firstName: 'Sophea',
      lastName: 'Chan',
      username: 'sophea_customer'
    },
    {
      telegramId: BigInt('987654321'),
      firstName: 'David',
      lastName: 'Smith',
      username: 'david_tourist'
    },
    {
      telegramId: BigInt('555666777'),
      firstName: 'Sreypov',
      lastName: 'Kem',
      username: 'sreypov_local'
    },
    {
      telegramId: BigInt('888999111'),
      firstName: 'Marie',
      lastName: 'Dubois',
      username: 'marie_expat'
    },
    {
      telegramId: BigInt('333444555'),
      firstName: 'Pisach',
      lastName: 'Lim',
      username: 'pisach_businessman'
    }
  ]
};

// Main seeding functions
export const seedDatabase = async () => {
  try {
    console.log('🌱 Starting comprehensive database seeding...');
    
    const db = getDatabase();
    
    // Check if data already exists
    const existingRestaurants = await db.select().from(schema.restaurants).limit(1);
    if (existingRestaurants.length > 0) {
      console.log('⚠️ Database already contains data. Skipping seed.');
      return;
    }

    // 1. Seed restaurants
    console.log('🏢 Seeding restaurants...');
    const insertedRestaurants = await db
      .insert(schema.restaurants)
      .values(sampleData.restaurants)
      .returning();
    console.log(`✅ Inserted ${insertedRestaurants.length} restaurants`);

    // 2. Seed staff for each restaurant
    console.log('👨‍💼 Seeding staff...');
    const staffData = sampleData.staff.map(staff => ({
      restaurantId: insertedRestaurants[staff.restaurantIndex]!.id,
      telegramId: staff.telegramId,
      role: staff.role,
    }));
    const insertedStaff = await db
      .insert(schema.staff)
      .values(staffData)
      .returning();
    console.log(`✅ Inserted ${insertedStaff.length} staff members`);

    // 3. Seed telegram groups
    console.log('💬 Seeding telegram groups...');
    const groupData = sampleData.telegramGroups.map(group => ({
      chatId: group.chatId,
      restaurantId: insertedRestaurants[group.restaurantIndex]!.id,
      groupType: group.groupType,
    }));
    const insertedGroups = await db
      .insert(schema.telegramGroups)
      .values(groupData)
      .returning();
    console.log(`✅ Inserted ${insertedGroups.length} telegram groups`);

    // 4. Seed tables (10 per restaurant)
    console.log('🪑 Seeding tables...');
    const tables: any[] = [];
    for (const restaurant of insertedRestaurants) {
      for (let i = 1; i <= 10; i++) {
        tables.push({
          restaurantId: restaurant.id,
          number: i.toString().padStart(2, '0'),
        });
      }
    }
    const insertedTables = await db
      .insert(schema.tables)
      .values(tables)
      .returning();
    console.log(`✅ Inserted ${insertedTables.length} tables`);

    // 5. Seed menu categories
    console.log('📋 Seeding menu categories...');
    const categoriesData = sampleData.menuCategories.map(category => ({
      ...category,
      restaurantId: insertedRestaurants[category.restaurantIndex]!.id,
    }));
    const insertedCategories = await db
      .insert(schema.menuCategories)
      .values(categoriesData)
      .returning();
    console.log(`✅ Inserted ${insertedCategories.length} menu categories`);

    // 6. Seed menu items
    console.log('🍽️ Seeding menu items...');
    const menuItemsData = sampleData.menuItems.map((item, _index) => ({
      ...item,
      categoryId: insertedCategories[item.categoryIndex]!.id,
      restaurantId: insertedRestaurants[item.restaurantIndex]!.id,
    }));
    const insertedMenuItems = await db
      .insert(schema.menuItems)
      .values(menuItemsData)
      .returning();
    console.log(`✅ Inserted ${insertedMenuItems.length} menu items`);

    // 7. Seed menu item variants
    console.log('🔄 Seeding menu item variants...');
    const variants: any[] = [];
    insertedMenuItems.forEach((menuItem, itemIndex) => {
      const basePrice = sampleData.basePrices[itemIndex] || 10.00;
      
      sampleData.variantTemplates.forEach((template) => {
        variants.push({
          menuItemId: menuItem.id,
          size: template.size,
          name: template.name,
          nameKh: template.nameKh,
          price: (basePrice * template.priceMultiplier).toFixed(2),
          isDefault: template.isDefault,
          sortOrder: template.sortOrder,
        });
      });
    });
    const insertedVariants = await db
      .insert(schema.menuItemVariants)
      .values(variants)
      .returning();
    console.log(`✅ Inserted ${insertedVariants.length} menu item variants`);

    // 8. Seed kitchen loads
    console.log('👨‍🍳 Seeding kitchen loads...');
    const kitchenLoads = insertedRestaurants.map(restaurant => ({
      restaurantId: restaurant.id,
      currentOrders: Math.floor(Math.random() * 8) + 2, // 2-10 current orders
      averagePreparationTime: Math.floor(Math.random() * 10) + 15, // 15-25 minutes
    }));
    const insertedLoads = await db
      .insert(schema.kitchenLoads)
      .values(kitchenLoads)
      .returning();
    console.log(`✅ Inserted ${insertedLoads.length} kitchen load records`);

    // 9. Seed sample orders
    console.log('📝 Seeding sample orders...');
    const orders: any[] = [];
    const orderItems: any[] = [];
    
    // Create 8 sample orders across restaurants
    for (let i = 0; i < 8; i++) {
      const customer = sampleData.sampleCustomers[i % sampleData.sampleCustomers.length]!;
      const restaurant = insertedRestaurants[i % insertedRestaurants.length]!;
      const table = insertedTables.find(t => t.restaurantId === restaurant.id);
      
      if (!table) continue;

      const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now() + i).slice(-6)}`;
      const status = ['pending', 'confirmed', 'preparing', 'ready'][i % 4];
      
      const order = {
        customerTelegramId: customer.telegramId,
        customerName: `${customer.firstName} ${customer.lastName}`,
        restaurantId: restaurant.id,
        tableId: table.id,
        orderNumber,
        status,
        totalAmount: '0', // Will calculate after items
        estimatedPreparationMinutes: Math.floor(Math.random() * 20) + 15,
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
      const restaurant = insertedRestaurants.find(r => r.id === order.restaurantId);
      if (!restaurant) continue;

      // Get variants for this restaurant's menu items
      const restaurantVariants = insertedVariants.filter(v => {
        const menuItem = insertedMenuItems.find(item => item.id === v.menuItemId && item.restaurantId === restaurant.id);
        return menuItem !== undefined;
      });

      if (restaurantVariants.length === 0) continue;

      // Add 1-3 items per order
      const numItems = Math.floor(Math.random() * 3) + 1;
      let totalAmount = 0;

      for (let j = 0; j < numItems && j < restaurantVariants.length; j++) {
        const variant = restaurantVariants[j % restaurantVariants.length]!;
        const quantity = Math.floor(Math.random() * 3) + 1;
        const unitPrice = parseFloat(variant.price);
        const subtotal = unitPrice * quantity;
        totalAmount += subtotal;

        orderItems.push({
          orderId: order.id,
          menuItemId: variant.menuItemId,
          variantId: variant.id,
          quantity,
          spiceLevel: ['none', 'regular', 'spicy'][Math.floor(Math.random() * 3)],
          notes: j === 0 && i === 0 ? 'Extra crispy please' : undefined,
          subtotal: subtotal.toFixed(2),
        });
      }

      // Update order total
      await db
        .update(schema.orders)
        .set({ totalAmount: totalAmount.toFixed(2) })
        .where(eq(schema.orders.id, order.id));
    }

    if (orderItems.length > 0) {
      await db.insert(schema.orderItems).values(orderItems);
    }

    console.log(`✅ Inserted ${insertedOrders.length} orders with ${orderItems.length} order items`);

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- ${insertedRestaurants.length} restaurants`);
    console.log(`- ${insertedStaff.length} staff members`);
    console.log(`- ${insertedGroups.length} telegram groups`);
    console.log(`- ${insertedTables.length} tables`);
    console.log(`- ${insertedCategories.length} menu categories`);
    console.log(`- ${insertedMenuItems.length} menu items`);
    console.log(`- ${insertedVariants.length} menu item variants`);
    console.log(`- ${insertedLoads.length} kitchen load records`);
    console.log(`- ${insertedOrders.length} sample orders`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
};

// Clear database function
export const clearDatabase = async () => {
  try {
    console.log('🧹 Clearing database...');
    
    const db = getDatabase();
    
    // Delete in reverse order due to foreign keys
    await db.delete(schema.orderItems);
    await db.delete(schema.orders);
    await db.delete(schema.kitchenLoads);
    await db.delete(schema.menuItemVariants);
    await db.delete(schema.menuItems);
    await db.delete(schema.menuCategories);
    await db.delete(schema.telegramGroups);
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
      console.log('Usage: pnpm run seed [seed|clear|reseed]');
      process.exit(1);
  }
}
