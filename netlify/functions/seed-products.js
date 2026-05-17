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

    console.log('[seed-products] Creating Products table...');
    const tableRes = await req('POST',
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

    const PRODUCTS_TABLE_ID = tableRes.data.table_id;
    console.log('[seed-products] ✅ Products table created:', PRODUCTS_TABLE_ID);

    const products = [
      { product_id: 'LUNCH-001', name: 'Medium Bowl', category_id: 'LUNCH', type: 'customizable', base_price: 13, customization_json: '{"type":"bowl","bases":["Rice","Quinoa","Couscous"],"proteins":[{"name":"Salmone","price":3},{"name":"Pollo","price":2},{"name":"Tofu","price":2}],"extras":[{"name":"Avocado","price":3}]}', description: 'Crea la tua bowl personalizzata', allergens: 'G,L,E,N,F,S', available: 'yes' },
      { product_id: 'LUNCH-002', name: 'Large Bowl', category_id: 'LUNCH', type: 'customizable', base_price: 15, customization_json: '{"type":"bowl","bases":["Rice","Quinoa","Couscous"],"proteins":[{"name":"Salmone","price":3},{"name":"Pollo","price":2},{"name":"Tofu","price":2}],"extras":[{"name":"Avocado","price":3}]}', description: 'Crea la tua bowl personalizzata - Taglia Grande', allergens: 'G,L,E,N,F,S', available: 'yes' },
      { product_id: 'LUNCH-003', name: 'Vitello Tonnato', category_id: 'LUNCH', type: 'simple', base_price: 22, customization_json: '{}', description: 'Vitello affettato sottile con salsa tonnato', allergens: 'F', available: 'yes' },
      { product_id: 'LUNCH-004', name: 'Roast Beef Salad', category_id: 'LUNCH', type: 'simple', base_price: 18, customization_json: '{}', description: 'Roast beef su insalata mista', allergens: 'G', available: 'yes' },
      { product_id: 'LUNCH-005', name: 'Seafood Medley', category_id: 'LUNCH', type: 'simple', base_price: 24, customization_json: '{}', description: 'Mix di pesce fresco del giorno', allergens: 'F,S', available: 'yes' },
      { product_id: 'LUNCH-006', name: 'Minestrone', category_id: 'LUNCH', type: 'simple', base_price: 15, customization_json: '{}', description: 'Zuppa di verdure e legumi', allergens: 'G', available: 'yes' },
      { product_id: 'LUNCH-007', name: 'Pasta e Fagioli', category_id: 'LUNCH', type: 'simple', base_price: 16, customization_json: '{}', description: 'Classico primo piatto', allergens: 'G', available: 'yes' },
      { product_id: 'BREAKFAST-001', name: 'Avocado Toast', category_id: 'BREAKFAST', type: 'simple', base_price: 10, customization_json: '{}', description: 'Pane tostato con avocado', allergens: 'G,L,E', available: 'yes' },
      { product_id: 'BREAKFAST-002', name: 'Crema di Ricotta', category_id: 'BREAKFAST', type: 'simple', base_price: 9, customization_json: '{}', description: 'Toast con ricotta fresca', allergens: 'G,L,E', available: 'yes' },
      { product_id: 'BREAKFAST-003', name: 'Burrata & Tomato', category_id: 'BREAKFAST', type: 'simple', base_price: 11, customization_json: '{}', description: 'Toast con burrata e pomodoro', allergens: 'G,L', available: 'yes' },
      { product_id: 'BREAKFAST-004', name: 'Eggs & Bacon', category_id: 'BREAKFAST', type: 'simple', base_price: 15, customization_json: '{}', description: 'Uova e pancetta', allergens: 'G,E', available: 'yes' },
      { product_id: 'BREAKFAST-005', name: 'Frittata Zucchini', category_id: 'BREAKFAST', type: 'simple', base_price: 12, customization_json: '{}', description: 'Frittata con zucchine', allergens: 'G,L,E', available: 'yes' },
      { product_id: 'BREAKFAST-006', name: 'French Toast', category_id: 'BREAKFAST', type: 'simple', base_price: 10, customization_json: '{}', description: 'French toast dolce', allergens: 'G,L,E', available: 'yes' },
      { product_id: 'BREAKFAST-007', name: 'Croissant Burro', category_id: 'BREAKFAST', type: 'simple', base_price: 4, customization_json: '{}', description: 'Croissant al burro', allergens: 'G,L,E', available: 'yes' },
      { product_id: 'BREAKFAST-008', name: 'Croissant Chocolate', category_id: 'BREAKFAST', type: 'simple', base_price: 4.5, customization_json: '{}', description: 'Croissant al cioccolato', allergens: 'G,L,E', available: 'yes' },
      { product_id: 'BREAKFAST-009', name: 'Croissant Almond', category_id: 'BREAKFAST', type: 'simple', base_price: 5, customization_json: '{}', description: 'Croissant alle mandorle', allergens: 'G,L,E,N', available: 'yes' },
      { product_id: 'BREAKFAST-010', name: 'Cornetto', category_id: 'BREAKFAST', type: 'simple', base_price: 3.5, customization_json: '{}', description: 'Cornetto classico', allergens: 'G,L,E', available: 'yes' },
      { product_id: 'BREAKFAST-011', name: 'Maritozzo', category_id: 'BREAKFAST', type: 'simple', base_price: 4, customization_json: '{}', description: 'Maritozzo con panna', allergens: 'G,L,E', available: 'yes' },
      { product_id: 'BREAKFAST-012', name: 'Bombolone', category_id: 'BREAKFAST', type: 'simple', base_price: 5, customization_json: '{}', description: 'Bombolone ripieno', allergens: 'G,L,E', available: 'yes' },
      { product_id: 'BREAKFAST-013', name: 'Brioches Nutella', category_id: 'BREAKFAST', type: 'simple', base_price: 4.5, customization_json: '{}', description: 'Brioches con Nutella', allergens: 'G,L,E,N', available: 'yes' },
      { product_id: 'BREAKFAST-014', name: 'Panino Prosciutto Crudo', category_id: 'BREAKFAST', type: 'simple', base_price: 8, customization_json: '{}', description: 'Panino con prosciutto crudo', allergens: 'G', available: 'yes' },
      { product_id: 'BREAKFAST-015', name: 'Panino Mortadella', category_id: 'BREAKFAST', type: 'simple', base_price: 7.5, customization_json: '{}', description: 'Panino con mortadella', allergens: 'G', available: 'yes' },
      { product_id: 'COFFEE-001', name: 'Espresso', category_id: 'COFFEE', type: 'simple', base_price: 2.5, customization_json: '{}', description: 'Espresso classico', allergens: '', available: 'yes' },
      { product_id: 'COFFEE-002', name: 'Doppio Espresso', category_id: 'COFFEE', type: 'simple', base_price: 3.5, customization_json: '{}', description: 'Doppio espresso', allergens: '', available: 'yes' },
      { product_id: 'COFFEE-003', name: 'Cappuccino', category_id: 'COFFEE', type: 'simple', base_price: 4, customization_json: '{}', description: 'Cappuccino', allergens: 'L', available: 'yes' },
      { product_id: 'COFFEE-004', name: 'Cappuccino Oat', category_id: 'COFFEE', type: 'simple', base_price: 4.5, customization_json: '{}', description: 'Cappuccino con latte di avena', allergens: 'G', available: 'yes' },
      { product_id: 'COFFEE-005', name: 'Cappuccino Soy', category_id: 'COFFEE', type: 'simple', base_price: 4.5, customization_json: '{}', description: 'Cappuccino con latte di soia', allergens: '', available: 'yes' },
      { product_id: 'COFFEE-006', name: 'Cappuccino Almond', category_id: 'COFFEE', type: 'simple', base_price: 4.5, customization_json: '{}', description: 'Cappuccino con latte di mandorla', allergens: 'N', available: 'yes' },
      { product_id: 'COFFEE-007', name: 'Cappuccino Coconut', category_id: 'COFFEE', type: 'simple', base_price: 4.5, customization_json: '{}', description: 'Cappuccino con latte di cocco', allergens: '', available: 'yes' },
      { product_id: 'COFFEE-008', name: 'Macchiato', category_id: 'COFFEE', type: 'simple', base_price: 3, customization_json: '{}', description: 'Espresso macchiato', allergens: 'L', available: 'yes' },
      { product_id: 'COFFEE-009', name: 'Latte Macchiato', category_id: 'COFFEE', type: 'simple', base_price: 4, customization_json: '{}', description: 'Latte macchiato', allergens: 'L', available: 'yes' },
      { product_id: 'COFFEE-010', name: 'Caffè Lungo', category_id: 'COFFEE', type: 'simple', base_price: 2.5, customization_json: '{}', description: 'Caffè lungo', allergens: '', available: 'yes' },
      { product_id: 'COFFEE-011', name: 'Affogato', category_id: 'COFFEE', type: 'simple', base_price: 4.5, customization_json: '{}', description: 'Gelato con espresso', allergens: 'L,E', available: 'yes' },
      { product_id: 'COFFEE-012', name: 'Arancia Fresca', category_id: 'COFFEE', type: 'simple', base_price: 7, customization_json: '{}', description: 'Succo di arancia fresco', allergens: '', available: 'yes' },
      { product_id: 'COFFEE-013', name: 'Carota Zenzero', category_id: 'COFFEE', type: 'simple', base_price: 7, customization_json: '{}', description: 'Succo carota e zenzero', allergens: '', available: 'yes' },
      { product_id: 'COFFEE-014', name: 'Verde Detox', category_id: 'COFFEE', type: 'simple', base_price: 7, customization_json: '{}', description: 'Succo verde detox', allergens: '', available: 'yes' },
      { product_id: 'COFFEE-015', name: 'Latte Mandorla', category_id: 'COFFEE', type: 'simple', base_price: 5, customization_json: '{}', description: 'Latte di mandorla', allergens: 'N', available: 'yes' },
      { product_id: 'COFFEE-016', name: 'Latte Cocco', category_id: 'COFFEE', type: 'simple', base_price: 5, customization_json: '{}', description: 'Latte di cocco', allergens: '', available: 'yes' },
      { product_id: 'COFFEE-017', name: 'Smoothie Fragola', category_id: 'COFFEE', type: 'simple', base_price: 6, customization_json: '{}', description: 'Smoothie di fragola', allergens: '', available: 'yes' },
      { product_id: 'COFFEE-018', name: 'Smoothie Mango', category_id: 'COFFEE', type: 'simple', base_price: 6, customization_json: '{}', description: 'Smoothie di mango', allergens: '', available: 'yes' },
      { product_id: 'COFFEE-019', name: 'Kombucha', category_id: 'COFFEE', type: 'simple', base_price: 5, customization_json: '{}', description: 'Kombucha bio', allergens: '', available: 'yes' },
      { product_id: 'COFFEE-020', name: 'Acqua', category_id: 'COFFEE', type: 'simple', base_price: 1.5, customization_json: '{}', description: 'Acqua', allergens: '', available: 'yes' },
      { product_id: 'COFFEE-021', name: 'Birra Artigianale 1', category_id: 'COFFEE', type: 'simple', base_price: 6, customization_json: '{}', description: 'Birra artigianale locale', allergens: 'G', available: 'yes' },
      { product_id: 'COFFEE-022', name: 'Birra Artigianale 2', category_id: 'COFFEE', type: 'simple', base_price: 6, customization_json: '{}', description: 'Birra artigianale locale', allergens: 'G', available: 'yes' },
      { product_id: 'WINE-001', name: 'Mojito', category_id: 'WINE', type: 'simple', base_price: 9, customization_json: '{}', description: 'Cocktail Mojito classico', allergens: '', available: 'yes' },
      { product_id: 'WINE-002', name: 'Margarita', category_id: 'WINE', type: 'simple', base_price: 9, customization_json: '{}', description: 'Cocktail Margarita', allergens: '', available: 'yes' },
      { product_id: 'WINE-003', name: 'Negroni', category_id: 'WINE', type: 'simple', base_price: 10, customization_json: '{}', description: 'Cocktail Negroni', allergens: '', available: 'yes' },
      { product_id: 'WINE-004', name: 'Aperol Spritz', category_id: 'WINE', type: 'simple', base_price: 8, customization_json: '{}', description: 'Aperol Spritz', allergens: '', available: 'yes' },
      { product_id: 'WINE-005', name: 'Old Fashioned', category_id: 'WINE', type: 'simple', base_price: 10, customization_json: '{}', description: 'Cocktail Old Fashioned', allergens: '', available: 'yes' },
      { product_id: 'WINE-006', name: 'Daiquiri', category_id: 'WINE', type: 'simple', base_price: 9, customization_json: '{}', description: 'Cocktail Daiquiri', allergens: '', available: 'yes' },
      { product_id: 'WINE-007', name: 'Piña Colada', category_id: 'WINE', type: 'simple', base_price: 9, customization_json: '{}', description: 'Cocktail Piña Colada', allergens: 'L', available: 'yes' },
      { product_id: 'WINE-008', name: 'Cosmopolitan', category_id: 'WINE', type: 'simple', base_price: 9, customization_json: '{}', description: 'Cocktail Cosmopolitan', allergens: '', available: 'yes' },
      { product_id: 'WINE-009', name: 'Long Island', category_id: 'WINE', type: 'simple', base_price: 11, customization_json: '{}', description: 'Cocktail Long Island', allergens: '', available: 'yes' },
      { product_id: 'WINE-010', name: 'Sangria', category_id: 'WINE', type: 'simple', base_price: 8, customization_json: '{}', description: 'Sangria rossa', allergens: '', available: 'yes' },
      { product_id: 'WINE-011', name: 'Prosecco', category_id: 'WINE', type: 'simple', base_price: 6, customization_json: '{}', description: 'Prosecco', allergens: '', available: 'yes' },
      { product_id: 'WINE-012', name: 'Signature Cocktail 1', category_id: 'WINE', type: 'simple', base_price: 12, customization_json: '{}', description: 'Cocktail signature della casa', allergens: '', available: 'yes' },
      { product_id: 'WINE-013', name: 'Signature Cocktail 2', category_id: 'WINE', type: 'simple', base_price: 12, customization_json: '{}', description: 'Cocktail signature della casa', allergens: '', available: 'yes' },
      { product_id: 'WINE-014', name: 'Bianco Secco', category_id: 'WINE', type: 'simple', base_price: 28, customization_json: '{}', description: 'Vino bianco secco', allergens: '', available: 'yes' },
      { product_id: 'WINE-015', name: 'Rosso Barolo', category_id: 'WINE', type: 'simple', base_price: 35, customization_json: '{}', description: 'Vino rosso Barolo', allergens: '', available: 'yes' },
      { product_id: 'WINE-016', name: 'Rosso Barbera', category_id: 'WINE', type: 'simple', base_price: 25, customization_json: '{}', description: 'Vino rosso Barbera', allergens: '', available: 'yes' },
      { product_id: 'WINE-017', name: 'Rosso Valpolicella', category_id: 'WINE', type: 'simple', base_price: 22, customization_json: '{}', description: 'Vino rosso Valpolicella', allergens: '', available: 'yes' },
      { product_id: 'WINE-018', name: 'Prosecco Extra Dry', category_id: 'WINE', type: 'simple', base_price: 20, customization_json: '{}', description: 'Prosecco Extra Dry', allergens: '', available: 'yes' },
      { product_id: 'WINE-019', name: 'Melanzane Fritte', category_id: 'WINE', type: 'simple', base_price: 8, customization_json: '{}', description: 'Melanzane fritte', allergens: 'G,L', available: 'yes' },
      { product_id: 'WINE-020', name: 'Tempura Verdure', category_id: 'WINE', type: 'simple', base_price: 10, customization_json: '{}', description: 'Tempura di verdure', allergens: 'G,E', available: 'yes' },
      { product_id: 'WINE-021', name: 'Polpettine Sugo', category_id: 'WINE', type: 'simple', base_price: 9, customization_json: '{}', description: 'Polpettine al sugo', allergens: 'G', available: 'yes' },
      { product_id: 'WINE-022', name: 'Focaccia al Rosmarino', category_id: 'WINE', type: 'simple', base_price: 5, customization_json: '{}', description: 'Focaccia al rosmarino', allergens: 'G,L', available: 'yes' },
      { product_id: 'WINE-023', name: 'Pane Integrale', category_id: 'WINE', type: 'simple', base_price: 3, customization_json: '{}', description: 'Pane integrale', allergens: 'G', available: 'yes' },
      { product_id: 'WINE-024', name: 'Burrata & Pomodori', category_id: 'WINE', type: 'simple', base_price: 12, customization_json: '{}', description: 'Burrata fresca con pomodori', allergens: 'L', available: 'yes' },
      { product_id: 'WINE-025', name: 'Tagliere Formaggi', category_id: 'WINE', type: 'simple', base_price: 18, customization_json: '{}', description: 'Tagliere di formaggi assortiti', allergens: 'L', available: 'yes' },
      { product_id: 'WINE-026', name: 'Tagliere Salumi', category_id: 'WINE', type: 'simple', base_price: 16, customization_json: '{}', description: 'Tagliere di salumi assortiti', allergens: '', available: 'yes' },
      { product_id: 'WINE-027', name: 'Olive Taggiasche', category_id: 'WINE', type: 'simple', base_price: 6, customization_json: '{}', description: 'Olive Taggiasche', allergens: '', available: 'yes' },
      { product_id: 'EXTRAS-001', name: 'Riso Bianco', category_id: 'EXTRAS', type: 'simple', base_price: 4, customization_json: '{}', description: 'Riso bianco', allergens: '', available: 'yes' },
      { product_id: 'EXTRAS-002', name: 'Quinoa', category_id: 'EXTRAS', type: 'simple', base_price: 5, customization_json: '{}', description: 'Quinoa', allergens: '', available: 'yes' },
      { product_id: 'EXTRAS-003', name: 'Verdure Grigliate', category_id: 'EXTRAS', type: 'simple', base_price: 6, customization_json: '{}', description: 'Verdure grigliate', allergens: '', available: 'yes' },
      { product_id: 'EXTRAS-004', name: 'Patate Dolci Arrosto', category_id: 'EXTRAS', type: 'simple', base_price: 6, customization_json: '{}', description: 'Patate dolci al forno', allergens: '', available: 'yes' },
      { product_id: 'EXTRAS-005', name: 'Focaccia al Formaggio', category_id: 'EXTRAS', type: 'simple', base_price: 5, customization_json: '{}', description: 'Focaccia al formaggio', allergens: 'G,L', available: 'yes' },
      { product_id: 'EXTRAS-006', name: 'Insalata Mista', category_id: 'EXTRAS', type: 'simple', base_price: 6, customization_json: '{}', description: 'Insalata mista fresca', allergens: '', available: 'yes' }
    ];

    console.log('[seed-products] Inserting products...');
    for (const product of products) {
      product.created_at = new Date().toISOString();
      product.updated_at = new Date().toISOString();
      
      await req('POST',
        `/open-apis/bitable/v1/apps/${BASE_ID}/tables/${PRODUCTS_TABLE_ID}/records`,
        { fields: product },
        TOKEN
      );
    }

    console.log('[seed-products] ✅ All products inserted');

    return {
      statusCode: 201,
      body: JSON.stringify({
        success: true,
        message: 'Products created successfully',
        table_id: PRODUCTS_TABLE_ID,
      }),
    };
  } catch (error) {
    console.error('[seed-products] Error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
