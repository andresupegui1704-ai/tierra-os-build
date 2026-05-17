const https = require('https');

const APP_ID = process.env.LARK_APP_ID;
const APP_SECRET = process.env.LARK_APP_SECRET;
const BASE_ID = process.env.LARK_BASE_ID;

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json; charset=utf-8' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const r = https.request({ hostname: 'open.larksuite.com', path, method, headers }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

exports.handler = async (event) => {
  console.log('[seed-products] Starting...');
  
  try {
    const tokenRes = await req('POST', '/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: APP_ID,
      app_secret: APP_SECRET,
    });
    const TOKEN = tokenRes.tenant_access_token;
    console.log('[seed-products] Token obtained');

    // LIST tables to find Products (or create if not exists)
    console.log('[seed-products] Listing tables...');
    const tablesRes = await req('GET',
      `/open-apis/bitable/v1/apps/${BASE_ID}/tables?page_size=50`,
      null,
      TOKEN
    );

    let PRODUCTS_TABLE_ID = null;
    if (tablesRes.data && tablesRes.data.items) {
      const productsTable = tablesRes.data.items.find(t => t.name === 'Products');
      if (productsTable) {
        PRODUCTS_TABLE_ID = productsTable.table_id;
        console.log('[seed-products] Found existing Products table:', PRODUCTS_TABLE_ID);
      }
    }

    // If Products table doesn't exist, create it
    if (!PRODUCTS_TABLE_ID) {
      console.log('[seed-products] Creating Products table...');
      const createTableRes = await req('POST',
        `/open-apis/bitable/v1/apps/${BASE_ID}/tables`,
        {
          name: 'Products',
          fields: [
            { field_name: 'product_id', type: 1 },
            { field_name: 'name', type: 1 },
            { field_name: 'category_id', type: 1 },
            { field_name: 'type', type: 3, property: { options: [
              { name: 'simple', color: 0 },
              { name: 'customizable', color: 1 }
            ] } },
            { field_name: 'base_price', type: 2 },
            { field_name: 'available', type: 3, property: { options: [
              { name: 'yes', color: 1 },
              { name: 'no', color: 2 }
            ] } },
            { field_name: 'customization_json', type: 1 },
            { field_name: 'description', type: 1 },
            { field_name: 'allergens', type: 1 },
            { field_name: 'image_url', type: 1 },
            { field_name: 'created_at', type: 5 },
            { field_name: 'updated_at', type: 5 }
          ]
        },
        TOKEN
      );

      if (createTableRes.data && createTableRes.data.table_id) {
        PRODUCTS_TABLE_ID = createTableRes.data.table_id;
      } else if (createTableRes.code === 1254013) {
        // Table already exists error - list again
        const tablesRes2 = await req('GET',
          `/open-apis/bitable/v1/apps/${BASE_ID}/tables?page_size=50`,
          null,
          TOKEN
        );
        const productsTable = tablesRes2.data.items.find(t => t.name === 'Products');
        PRODUCTS_TABLE_ID = productsTable.table_id;
      } else {
        throw new Error(`Failed to create table: ${createTableRes.msg || JSON.stringify(createTableRes)}`);
      }
    }

    console.log('[seed-products] Using table:', PRODUCTS_TABLE_ID);

    const products = [
      { product_id: 'LUNCH-001', name: 'Medium Bowl', category_id: 'LUNCH', type: 'customizable', base_price: 13, customization_json: '{"type":"bowl"}', description: 'Crea la tua bowl', allergens: 'G,L,E,N,F,S', available: 'yes' },
      { product_id: 'LUNCH-002', name: 'Large Bowl', category_id: 'LUNCH', type: 'customizable', base_price: 15, customization_json: '{"type":"bowl"}', description: 'Large Bowl', allergens: 'G,L,E,N,F,S', available: 'yes' },
      { product_id: 'LUNCH-003', name: 'Vitello Tonnato', category_id: 'LUNCH', type: 'simple', base_price: 22, customization_json: '{}', description: 'Vitello tonnato', allergens: 'F', available: 'yes' },
      { product_id: 'LUNCH-004', name: 'Roast Beef Salad', category_id: 'LUNCH', type: 'simple', base_price: 18, customization_json: '{}', description: 'Roast beef', allergens: 'G', available: 'yes' },
      { product_id: 'LUNCH-005', name: 'Seafood Medley', category_id: 'LUNCH', type: 'simple', base_price: 24, customization_json: '{}', description: 'Seafood', allergens: 'F,S', available: 'yes' },
      { product_id: 'LUNCH-006', name: 'Minestrone', category_id: 'LUNCH', type: 'simple', base_price: 15, customization_json: '{}', description: 'Minestrone', allergens: 'G', available: 'yes' },
      { product_id: 'LUNCH-007', name: 'Pasta e Fagioli', category_id: 'LUNCH', type: 'simple', base_price: 16, customization_json: '{}', description: 'Pasta', allergens: 'G', available: 'yes' },
      { product_id: 'BREAKFAST-001', name: 'Avocado Toast', category_id: 'BREAKFAST', type: 'simple', base_price: 10, customization_json: '{}', description: 'Avocado', allergens: 'G,L,E', available: 'yes' },
      { product_id: 'BREAKFAST-002', name: 'Crema Ricotta', category_id: 'BREAKFAST', type: 'simple', base_price: 9, customization_json: '{}', description: 'Ricotta', allergens: 'G,L,E', available: 'yes' },
      { product_id: 'BREAKFAST-003', name: 'Burrata Tomato', category_id: 'BREAKFAST', type: 'simple', base_price: 11, customization_json: '{}', description: 'Burrata', allergens: 'G,L', available: 'yes' },
      { product_id: 'BREAKFAST-004', name: 'Eggs Bacon', category_id: 'BREAKFAST', type: 'simple', base_price: 15, customization_json: '{}', description: 'Eggs', allergens: 'G,E', available: 'yes' },
      { product_id: 'BREAKFAST-005', name: 'Frittata Zucchini', category_id: 'BREAKFAST', type: 'simple', base_price: 12, customization_json: '{}', description: 'Frittata', allergens: 'G,L,E', available: 'yes' },
      { product_id: 'BREAKFAST-006', name: 'French Toast', category_id: 'BREAKFAST', type: 'simple', base_price: 10, customization_json: '{}', description: 'French', allergens: 'G,L,E', available: 'yes' },
      { product_id: 'BREAKFAST-007', name: 'Croissant', category_id: 'BREAKFAST', type: 'simple', base_price: 4, customization_json: '{}', description: 'Croissant', allergens: 'G,L,E', available: 'yes' },
      { product_id: 'BREAKFAST-008', name: 'Croissant Choco', category_id: 'BREAKFAST', type: 'simple', base_price: 4.5, customization_json: '{}', description: 'Chocolate', allergens: 'G,L,E', available: 'yes' },
      { product_id: 'BREAKFAST-009', name: 'Croissant Almond', category_id: 'BREAKFAST', type: 'simple', base_price: 5, customization_json: '{}', description: 'Almond', allergens: 'G,L,E,N', available: 'yes' },
      { product_id: 'BREAKFAST-010', name: 'Cornetto', category_id: 'BREAKFAST', type: 'simple', base_price: 3.5, customization_json: '{}', description: 'Cornetto', allergens: 'G,L,E', available: 'yes' },
      { product_id: 'BREAKFAST-011', name: 'Maritozzo', category_id: 'BREAKFAST', type: 'simple', base_price: 4, customization_json: '{}', description: 'Maritozzo', allergens: 'G,L,E', available: 'yes' },
      { product_id: 'BREAKFAST-012', name: 'Bombolone', category_id: 'BREAKFAST', type: 'simple', base_price: 5, customization_json: '{}', description: 'Bombolone', allergens: 'G,L,E', available: 'yes' },
      { product_id: 'BREAKFAST-013', name: 'Brioches Nutella', category_id: 'BREAKFAST', type: 'simple', base_price: 4.5, customization_json: '{}', description: 'Nutella', allergens: 'G,L,E,N', available: 'yes' },
      { product_id: 'BREAKFAST-014', name: 'Panino Crudo', category_id: 'BREAKFAST', type: 'simple', base_price: 8, customization_json: '{}', description: 'Panino', allergens: 'G', available: 'yes' },
      { product_id: 'BREAKFAST-015', name: 'Panino Mortadella', category_id: 'BREAKFAST', type: 'simple', base_price: 7.5, customization_json: '{}', description: 'Mortadella', allergens: 'G', available: 'yes' },
      { product_id: 'COFFEE-001', name: 'Espresso', category_id: 'COFFEE', type: 'simple', base_price: 2.5, customization_json: '{}', description: 'Espresso', allergens: '', available: 'yes' },
      { product_id: 'COFFEE-002', name: 'Doppio', category_id: 'COFFEE', type: 'simple', base_price: 3.5, customization_json: '{}', description: 'Doppio', allergens: '', available: 'yes' },
      { product_id: 'COFFEE-003', name: 'Cappuccino', category_id: 'COFFEE', type: 'simple', base_price: 4, customization_json: '{}', description: 'Cappuccino', allergens: 'L', available: 'yes' },
      { product_id: 'COFFEE-004', name: 'Cappuccino Oat', category_id: 'COFFEE', type: 'simple', base_price: 4.5, customization_json: '{}', description: 'Oat milk', allergens: 'G', available: 'yes' },
      { product_id: 'COFFEE-005', name: 'Cappuccino Soy', category_id: 'COFFEE', type: 'simple', base_price: 4.5, customization_json: '{}', description: 'Soy milk', allergens: '', available: 'yes' },
      { product_id: 'COFFEE-006', name: 'Cappuccino Almond', category_id: 'COFFEE', type: 'simple', base_price: 4.5, customization_json: '{}', description: 'Almond', allergens: 'N', available: 'yes' },
      { product_id: 'COFFEE-007', name: 'Cappuccino Coconut', category_id: 'COFFEE', type: 'simple', base_price: 4.5, customization_json: '{}', description: 'Coconut', allergens: '', available: 'yes' },
      { product_id: 'COFFEE-008', name: 'Macchiato', category_id: 'COFFEE', type: 'simple', base_price: 3, customization_json: '{}', description: 'Macchiato', allergens: 'L', available: 'yes' },
      { product_id: 'COFFEE-009', name: 'Latte Macchiato', category_id: 'COFFEE', type: 'simple', base_price: 4, customization_json: '{}', description: 'Latte', allergens: 'L', available: 'yes' },
      { product_id: 'COFFEE-010', name: 'Lungo', category_id: 'COFFEE', type: 'simple', base_price: 2.5, customization_json: '{}', description: 'Lungo', allergens: '', available: 'yes' },
      { product_id: 'COFFEE-011', name: 'Affogato', category_id: 'COFFEE', type: 'simple', base_price: 4.5, customization_json: '{}', description: 'Affogato', allergens: 'L,E', available: 'yes' },
      { product_id: 'COFFEE-012', name: 'Arancia', category_id: 'COFFEE', type: 'simple', base_price: 7, customization_json: '{}', description: 'Orange juice', allergens: '', available: 'yes' },
      { product_id: 'COFFEE-013', name: 'Carota Zenzero', category_id: 'COFFEE', type: 'simple', base_price: 7, customization_json: '{}', description: 'Carrot', allergens: '', available: 'yes' },
      { product_id: 'COFFEE-014', name: 'Verde Detox', category_id: 'COFFEE', type: 'simple', base_price: 7, customization_json: '{}', description: 'Green', allergens: '', available: 'yes' },
      { product_id: 'COFFEE-015', name: 'Latte Mandorla', category_id: 'COFFEE', type: 'simple', base_price: 5, customization_json: '{}', description: 'Almond milk', allergens: 'N', available: 'yes' },
      { product_id: 'COFFEE-016', name: 'Latte Cocco', category_id: 'COFFEE', type: 'simple', base_price: 5, customization_json: '{}', description: 'Coconut milk', allergens: '', available: 'yes' },
      { product_id: 'COFFEE-017', name: 'Smoothie Fragola', category_id: 'COFFEE', type: 'simple', base_price: 6, customization_json: '{}', description: 'Strawberry', allergens: '', available: 'yes' },
      { product_id: 'COFFEE-018', name: 'Smoothie Mango', category_id: 'COFFEE', type: 'simple', base_price: 6, customization_json: '{}', description: 'Mango', allergens: '', available: 'yes' },
      { product_id: 'COFFEE-019', name: 'Kombucha', category_id: 'COFFEE', type: 'simple', base_price: 5, customization_json: '{}', description: 'Kombucha', allergens: '', available: 'yes' },
      { product_id: 'COFFEE-020', name: 'Acqua', category_id: 'COFFEE', type: 'simple', base_price: 1.5, customization_json: '{}', description: 'Water', allergens: '', available: 'yes' },
      { product_id: 'COFFEE-021', name: 'Birra 1', category_id: 'COFFEE', type: 'simple', base_price: 6, customization_json: '{}', description: 'Beer 1', allergens: 'G', available: 'yes' },
      { product_id: 'COFFEE-022', name: 'Birra 2', category_id: 'COFFEE', type: 'simple', base_price: 6, customization_json: '{}', description: 'Beer 2', allergens: 'G', available: 'yes' },
      { product_id: 'WINE-001', name: 'Mojito', category_id: 'WINE', type: 'simple', base_price: 9, customization_json: '{}', description: 'Mojito', allergens: '', available: 'yes' },
      { product_id: 'WINE-002', name: 'Margarita', category_id: 'WINE', type: 'simple', base_price: 9, customization_json: '{}', description: 'Margarita', allergens: '', available: 'yes' },
      { product_id: 'WINE-003', name: 'Negroni', category_id: 'WINE', type: 'simple', base_price: 10, customization_json: '{}', description: 'Negroni', allergens: '', available: 'yes' },
      { product_id: 'WINE-004', name: 'Aperol Spritz', category_id: 'WINE', type: 'simple', base_price: 8, customization_json: '{}', description: 'Aperol', allergens: '', available: 'yes' },
      { product_id: 'WINE-005', name: 'Old Fashioned', category_id: 'WINE', type: 'simple', base_price: 10, customization_json: '{}', description: 'Old', allergens: '', available: 'yes' },
      { product_id: 'WINE-006', name: 'Daiquiri', category_id: 'WINE', type: 'simple', base_price: 9, customization_json: '{}', description: 'Daiquiri', allergens: '', available: 'yes' },
      { product_id: 'WINE-007', name: 'Pina Colada', category_id: 'WINE', type: 'simple', base_price: 9, customization_json: '{}', description: 'Colada', allergens: 'L', available: 'yes' },
      { product_id: 'WINE-008', name: 'Cosmopolitan', category_id: 'WINE', type: 'simple', base_price: 9, customization_json: '{}', description: 'Cosmo', allergens: '', available: 'yes' },
      { product_id: 'WINE-009', name: 'Long Island', category_id: 'WINE', type: 'simple', base_price: 11, customization_json: '{}', description: 'Long', allergens: '', available: 'yes' },
      { product_id: 'WINE-010', name: 'Sangria', category_id: 'WINE', type: 'simple', base_price: 8, customization_json: '{}', description: 'Sangria', allergens: '', available: 'yes' },
      { product_id: 'WINE-011', name: 'Prosecco', category_id: 'WINE', type: 'simple', base_price: 6, customization_json: '{}', description: 'Prosecco', allergens: '', available: 'yes' },
      { product_id: 'WINE-012', name: 'Sig Cocktail 1', category_id: 'WINE', type: 'simple', base_price: 12, customization_json: '{}', description: 'Sig 1', allergens: '', available: 'yes' },
      { product_id: 'WINE-013', name: 'Sig Cocktail 2', category_id: 'WINE', type: 'simple', base_price: 12, customization_json: '{}', description: 'Sig 2', allergens: '', available: 'yes' },
      { product_id: 'WINE-014', name: 'Bianco Secco', category_id: 'WINE', type: 'simple', base_price: 28, customization_json: '{}', description: 'White wine', allergens: '', available: 'yes' },
      { product_id: 'WINE-015', name: 'Barolo', category_id: 'WINE', type: 'simple', base_price: 35, customization_json: '{}', description: 'Barolo', allergens: '', available: 'yes' },
      { product_id: 'WINE-016', name: 'Barbera', category_id: 'WINE', type: 'simple', base_price: 25, customization_json: '{}', description: 'Barbera', allergens: '', available: 'yes' },
      { product_id: 'WINE-017', name: 'Valpolicella', category_id: 'WINE', type: 'simple', base_price: 22, customization_json: '{}', description: 'Valpo', allergens: '', available: 'yes' },
      { product_id: 'WINE-018', name: 'Prosecco XD', category_id: 'WINE', type: 'simple', base_price: 20, customization_json: '{}', description: 'Extra Dry', allergens: '', available: 'yes' },
      { product_id: 'WINE-019', name: 'Melanzane', category_id: 'WINE', type: 'simple', base_price: 8, customization_json: '{}', description: 'Eggplant', allergens: 'G,L', available: 'yes' },
      { product_id: 'WINE-020', name: 'Tempura', category_id: 'WINE', type: 'simple', base_price: 10, customization_json: '{}', description: 'Tempura', allergens: 'G,E', available: 'yes' },
      { product_id: 'WINE-021', name: 'Polpette', category_id: 'WINE', type: 'simple', base_price: 9, customization_json: '{}', description: 'Meatballs', allergens: 'G', available: 'yes' },
      { product_id: 'WINE-022', name: 'Focaccia', category_id: 'WINE', type: 'simple', base_price: 5, customization_json: '{}', description: 'Focaccia', allergens: 'G,L', available: 'yes' },
      { product_id: 'WINE-023', name: 'Pane', category_id: 'WINE', type: 'simple', base_price: 3, customization_json: '{}', description: 'Bread', allergens: 'G', available: 'yes' },
      { product_id: 'WINE-024', name: 'Burrata Pom', category_id: 'WINE', type: 'simple', base_price: 12, customization_json: '{}', description: 'Burrata', allergens: 'L', available: 'yes' },
      { product_id: 'WINE-025', name: 'Tagliere Formaggi', category_id: 'WINE', type: 'simple', base_price: 18, customization_json: '{}', description: 'Cheese board', allergens: 'L', available: 'yes' },
      { product_id: 'WINE-026', name: 'Tagliere Salumi', category_id: 'WINE', type: 'simple', base_price: 16, customization_json: '{}', description: 'Meat board', allergens: '', available: 'yes' },
      { product_id: 'WINE-027', name: 'Olive', category_id: 'WINE', type: 'simple', base_price: 6, customization_json: '{}', description: 'Olives', allergens: '', available: 'yes' },
      { product_id: 'EXTRAS-001', name: 'Riso Bianco', category_id: 'EXTRAS', type: 'simple', base_price: 4, customization_json: '{}', description: 'Rice', allergens: '', available: 'yes' },
      { product_id: 'EXTRAS-002', name: 'Quinoa', category_id: 'EXTRAS', type: 'simple', base_price: 5, customization_json: '{}', description: 'Quinoa', allergens: '', available: 'yes' },
      { product_id: 'EXTRAS-003', name: 'Verdure', category_id: 'EXTRAS', type: 'simple', base_price: 6, customization_json: '{}', description: 'Veggies', allergens: '', available: 'yes' },
      { product_id: 'EXTRAS-004', name: 'Patate Dolci', category_id: 'EXTRAS', type: 'simple', base_price: 6, customization_json: '{}', description: 'Sweet potatoes', allergens: '', available: 'yes' },
      { product_id: 'EXTRAS-005', name: 'Focaccia Formaggio', category_id: 'EXTRAS', type: 'simple', base_price: 5, customization_json: '{}', description: 'Cheese focaccia', allergens: 'G,L', available: 'yes' },
      { product_id: 'EXTRAS-006', name: 'Insalata', category_id: 'EXTRAS', type: 'simple', base_price: 6, customization_json: '{}', description: 'Salad', allergens: '', available: 'yes' }
    ];

    console.log('[seed-products] Inserting ' + products.length + ' products...');
    let count = 0;
    for (const product of products) {
      product.created_at = new Date().toISOString();
      product.updated_at = new Date().toISOString();
      
      await req('POST',
        `/open-apis/bitable/v1/apps/${BASE_ID}/tables/${PRODUCTS_TABLE_ID}/records`,
        { fields: product },
        TOKEN
      );
      count++;
      if (count % 10 === 0) console.log('[seed-products] ' + count + ' inserted...');
    }

    console.log('[seed-products] ✅ All products inserted');

    return {
      statusCode: 201,
      body: JSON.stringify({
        success: true,
        message: 'Products created successfully',
        table_id: PRODUCTS_TABLE_ID,
        count: products.length,
      }),
    };
  } catch (error) {
    console.error('[seed-products] Error:', error.message, error.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
