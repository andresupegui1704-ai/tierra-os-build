const https = require('https');

const APP_ID = process.env.LARK_APP_ID;
const APP_SECRET = process.env.LARK_APP_SECRET;
const BASE_ID = process.env.LARK_BASE_ID;
const PRODUCTS_TABLE_ID = process.env.LARK_PRODUCTS_TABLE_ID;

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

exports.handler = async () => {
  try {
    const tokenRes = await req('POST', '/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: APP_ID,
      app_secret: APP_SECRET,
    });
    const TOKEN = tokenRes.tenant_access_token;

    const products = [
      // ===== COFFEE =====
      { name: 'Espresso', category: 'Coffee & Drinks', subcategory: 'Coffee', price: 1.20, available: true, allergens: '' },
      { name: 'Macchiato', category: 'Coffee & Drinks', subcategory: 'Coffee', price: 1.50, available: true, allergens: 'L' },
      { name: 'Decaf', category: 'Coffee & Drinks', subcategory: 'Coffee', price: 1.50, available: true, allergens: '' },
      { name: 'Caffelatte', category: 'Coffee & Drinks', subcategory: 'Coffee', price: 2.50, available: true, allergens: 'L' },
      { name: 'Americano', category: 'Coffee & Drinks', subcategory: 'Coffee', price: 2.00, available: true, allergens: '' },
      { name: 'Flat White', category: 'Coffee & Drinks', subcategory: 'Coffee', price: 3.50, available: true, allergens: 'L' },

      // ===== CAPPUCCINO =====
      { name: 'Cappuccino Classic', category: 'Coffee & Drinks', subcategory: 'Cappuccino', price: 1.80, available: true, allergens: 'L' },
      { name: 'Cappuccino Oat', category: 'Coffee & Drinks', subcategory: 'Cappuccino', price: 2.00, available: true, allergens: 'G' },
      { name: 'Cappuccino Soy', category: 'Coffee & Drinks', subcategory: 'Cappuccino', price: 2.00, available: true, allergens: '' },
      { name: 'Cappuccino Almond', category: 'Coffee & Drinks', subcategory: 'Cappuccino', price: 2.30, available: true, allergens: 'N' },
      { name: 'Cappuccino Coconut', category: 'Coffee & Drinks', subcategory: 'Cappuccino', price: 2.30, available: true, allergens: '' },

      // ===== SIGNATURE JUICES =====
      { name: 'Red Antiox', category: 'Coffee & Drinks', subcategory: 'Signature Juices', price: 7.00, available: true, description: 'apple, beetroot, carrot, ginger - rich in antioxidants & anthocyanins', allergens: '' },
      { name: 'Green Detox', category: 'Coffee & Drinks', subcategory: 'Signature Juices', price: 7.00, available: true, description: 'fennel, cucumber, celery, apple - fresh & cleansing', allergens: '' },
      { name: 'Ace Boost', category: 'Coffee & Drinks', subcategory: 'Signature Juices', price: 7.00, available: true, description: 'orange, carrot, apple, ginger - vitamin boost', allergens: '' },

      // ===== ORGANIC DRINKS =====
      { name: 'Bio Cola', category: 'Coffee & Drinks', subcategory: 'Organic Drinks', price: 4.00, available: true, allergens: '' },
      { name: 'Chinotto', category: 'Coffee & Drinks', subcategory: 'Organic Drinks', price: 4.00, available: true, allergens: '' },
      { name: 'Peach Tea', category: 'Coffee & Drinks', subcategory: 'Organic Drinks', price: 4.00, available: true, allergens: '' },
      { name: 'Water Naturale', category: 'Coffee & Drinks', subcategory: 'Organic Drinks', price: 2.00, available: true, allergens: '' },
      { name: 'Water Frizzante', category: 'Coffee & Drinks', subcategory: 'Organic Drinks', price: 2.00, available: true, allergens: '' },

      // ===== CRAFT BEERS =====
      { name: 'Giulia Blond', category: 'Coffee & Drinks', subcategory: 'Craft Beers', price: 7.00, available: true, allergens: 'G' },
      { name: 'Giulia Weiss', category: 'Coffee & Drinks', subcategory: 'Craft Beers', price: 7.00, available: true, allergens: 'G' },
      { name: 'Giulia Amber', category: 'Coffee & Drinks', subcategory: 'Craft Beers', price: 7.00, available: true, allergens: 'G' },

      // ===== LUNCH - BOWLS =====
      { name: 'Medium Bowl', category: 'Lunch', subcategory: 'Create Your Bowl', price: 13.00, available: true, description: '150g rice, 150g seasonal vegetables. Protein not included.', notes: 'Add protein: Meat +€2, Seafood +€3, Vegan +€2', allergens: '' },
      { name: 'Large Bowl', category: 'Lunch', subcategory: 'Create Your Bowl', price: 15.00, available: true, description: '200g rice, 180g seasonal vegetables. Protein not included.', notes: 'Add protein: Meat +€2, Seafood +€3, Vegan +€2', allergens: '' },

      // ===== PROTEINS - MEAT =====
      { name: 'Lemon Meatballs', category: 'Lunch', subcategory: 'Protein Meat', price: 2.00, available: true, notes: 'Supplement for bowl', allergens: 'G' },
      { name: 'Oriental Chicken', category: 'Lunch', subcategory: 'Protein Meat', price: 2.00, available: true, notes: 'Supplement for bowl', allergens: '' },
      { name: 'Curry Chicken', category: 'Lunch', subcategory: 'Protein Meat', price: 2.00, available: true, notes: 'Supplement for bowl', allergens: '' },

      // ===== PROTEINS - SEAFOOD =====
      { name: 'Salmon Ceviche', category: 'Lunch', subcategory: 'Protein Seafood', price: 3.00, available: true, notes: 'Supplement for bowl', allergens: 'F' },
      { name: 'Tuna Tataki', category: 'Lunch', subcategory: 'Protein Seafood', price: 3.00, available: true, notes: 'Supplement for bowl', allergens: 'F' },
      { name: 'Baccalà', category: 'Lunch', subcategory: 'Protein Seafood', price: 3.00, available: true, notes: 'Supplement for bowl', allergens: 'F' },
      { name: 'Oriental Octopus', category: 'Lunch', subcategory: 'Protein Seafood', price: 3.00, available: true, notes: 'Supplement for bowl', allergens: 'S' },
      { name: 'Red Shrimp', category: 'Lunch', subcategory: 'Protein Seafood', price: 3.00, available: true, notes: 'Supplement for bowl', allergens: 'S' },

      // ===== PROTEINS - VEGAN =====
      { name: 'Chickpea Hummus', category: 'Lunch', subcategory: 'Protein Vegan', price: 2.00, available: true, notes: 'Supplement for bowl', allergens: '' },
      { name: 'Pumpkin Hummus', category: 'Lunch', subcategory: 'Protein Vegan', price: 2.00, available: true, notes: 'Supplement for bowl', allergens: '' },
      { name: 'Beet Hummus', category: 'Lunch', subcategory: 'Protein Vegan', price: 2.00, available: true, notes: 'Supplement for bowl', allergens: '' },

      // ===== EXTRAS =====
      { name: 'Avocado', category: 'Lunch', subcategory: 'Extras', price: 3.00, available: true, allergens: '' },
      { name: 'Extra Protein', category: 'Lunch', subcategory: 'Extras', price: 3.00, available: true, allergens: '' },

      // ===== LUNCH - SPECIALS =====
      { name: 'Vitello Tonnato', category: 'Lunch', subcategory: 'Specials', price: 22.00, available: true, allergens: 'F,E' },
      { name: 'Roast Beef Plate', category: 'Lunch', subcategory: 'Specials', price: 18.00, available: true, allergens: '' },
      { name: 'Fish Soup', category: 'Lunch', subcategory: 'Specials', price: 18.00, available: true, allergens: 'F,S' },
      { name: 'Veg Soup', category: 'Lunch', subcategory: 'Specials', price: 15.00, available: true, allergens: '' },
      { name: 'Tierra Plate', category: 'Lunch', subcategory: 'Specials', price: 17.00, available: true, description: '2 proteins included, seasonal vegetables', allergens: '' },

      // ===== DRINKS - CLASSICS =====
      { name: 'Gin Tonic', category: 'Drinks Wines Bites', subcategory: 'Classics', price: 8.00, available: true, allergens: '' },
      { name: 'Negroni', category: 'Drinks Wines Bites', subcategory: 'Classics', price: 8.00, available: true, allergens: '' },
      { name: 'Negroni Sbagliato', category: 'Drinks Wines Bites', subcategory: 'Classics', price: 8.00, available: true, allergens: '' },
      { name: 'Americano Cocktail', category: 'Drinks Wines Bites', subcategory: 'Classics', price: 8.00, available: true, allergens: '' },
      { name: 'Spritz Campari', category: 'Drinks Wines Bites', subcategory: 'Classics', price: 8.00, available: true, allergens: '' },
      { name: 'Spritz Aperol', category: 'Drinks Wines Bites', subcategory: 'Classics', price: 8.00, available: true, allergens: '' },

      // ===== SIGNATURE COCKTAILS =====
      { name: 'Moscow Mule', category: 'Drinks Wines Bites', subcategory: 'Signature Cocktails', price: 10.00, available: true, allergens: '' },
      { name: 'London Mule', category: 'Drinks Wines Bites', subcategory: 'Signature Cocktails', price: 10.00, available: true, allergens: '' },
      { name: 'Whisky Sour', category: 'Drinks Wines Bites', subcategory: 'Signature Cocktails', price: 10.00, available: true, allergens: 'E' },
      { name: 'Disaronno Sour', category: 'Drinks Wines Bites', subcategory: 'Signature Cocktails', price: 10.00, available: true, allergens: 'E,N' },

      // ===== PREMIUM =====
      { name: 'Gin Tonic Premium', category: 'Drinks Wines Bites', subcategory: 'Premium', price: 10.00, price_alt: 12.00, available: true, description: 'Premium gin selection', allergens: '' },
      { name: 'Hugo Spritz Special', category: 'Drinks Wines Bites', subcategory: 'Premium', price: 10.00, available: true, allergens: '' },
      { name: 'Mocktail', category: 'Drinks Wines Bites', subcategory: 'Premium', price: 7.00, available: true, allergens: '' },

      // ===== BEERS (Drinks Wines Bites) =====
      { name: 'Craft Beer Selection', category: 'Drinks Wines Bites', subcategory: 'Beers', price: 7.00, available: true, description: 'Blonde, Weiss, Red - craft selection', allergens: 'G' },

      // ===== WHITE WINES =====
      { name: 'Passerina', category: 'Drinks Wines Bites', subcategory: 'White Wines', price: 7.00, available: true, description: 'Fresh, citrus, mineral', allergens: '' },
      { name: 'Pinot Grigio', category: 'Drinks Wines Bites', subcategory: 'White Wines', price: 7.00, available: true, description: 'Soft, balanced, fruity', allergens: '' },
      { name: 'Sauvignon', category: 'Drinks Wines Bites', subcategory: 'White Wines', price: 7.00, available: true, description: 'Aromatic, herbal, vibrant', allergens: '' },

      // ===== RED WINES =====
      { name: 'Primitivo', category: 'Drinks Wines Bites', subcategory: 'Red Wines', price: 8.00, available: true, description: 'Full body, warm, smooth', allergens: '' },
      { name: 'Montepulciano', category: 'Drinks Wines Bites', subcategory: 'Red Wines', price: 8.00, available: true, description: 'Structured, dark fruit, spice', allergens: '' },

      // ===== APERITIVO FORMULA =====
      { name: 'Aperitivo Formula', category: 'Drinks Wines Bites', subcategory: 'Aperitivo', price: 15.00, available: true, description: 'Vegetable tempura, rosemary focaccia, hummus, confit tomatoes, chef\'s fried selection + 1 standard drink or 1 glass of wine', allergens: 'G' },

      // ===== BITES - SIGNATURE =====
      { name: 'Eggplant Parmigiana', category: 'Drinks Wines Bites', subcategory: 'Signature Bites', price: 12.00, available: true, allergens: 'G,L' },
      { name: 'Brioche Bite', category: 'Drinks Wines Bites', subcategory: 'Signature Bites', price: 10.00, available: true, description: 'Ricotta cream, anchovies, onion marmelade', allergens: 'G,L,E,F' },
      { name: 'Bruschetta', category: 'Drinks Wines Bites', subcategory: 'Signature Bites', price: 8.00, available: true, allergens: 'G' },

      // ===== BITES - FRIED/TEMPURA =====
      { name: 'Cardoncelli Mushroom Tempura', category: 'Drinks Wines Bites', subcategory: 'Fried Tempura', price: 10.00, available: true, allergens: 'G,E' },
      { name: 'Prawns Tempura', category: 'Drinks Wines Bites', subcategory: 'Fried Tempura', price: 10.00, available: true, allergens: 'G,E,S' },
      { name: 'Eggplant Meatballs', category: 'Drinks Wines Bites', subcategory: 'Fried Tempura', price: 8.00, available: true, allergens: 'G' },

      // ===== BOARDS =====
      { name: 'Cheese Board', category: 'Drinks Wines Bites', subcategory: 'Boards', price: 15.00, available: true, description: 'Cheese, jam, honey', allergens: 'L' },
      { name: 'Salumi & Cheese Board', category: 'Drinks Wines Bites', subcategory: 'Boards', price: 15.00, price_alt: 25.00, available: true, description: 'Single (€15) / Sharing (€25)', allergens: 'L' },

      // ===== BREAKFAST - TOAST =====
      { name: 'Avocado Toast', category: 'Breakfast', subcategory: 'Toast', price: 15.00, available: true, description: 'Scrambled egg or fried egg', allergens: 'G,E' },
      { name: 'Avocado Toast Tartare', category: 'Breakfast', subcategory: 'Toast', price: 18.00, available: true, description: 'Tuna or salmon tartare', allergens: 'G,F' },

      // ===== BREAKFAST - EGGS =====
      { name: 'Eggs & Bacon', category: 'Breakfast', subcategory: 'Eggs', price: 15.00, available: true, description: 'Free range eggs, crispy bacon, maple syrup', allergens: 'E' },

      // ===== BREAKFAST - SWEET =====
      { name: 'French Toast', category: 'Breakfast', subcategory: 'Sweet', price: 10.00, available: true, description: 'Brioche, strawberries, whipped cream, dulce de leche', allergens: 'G,L,E' },

      // ===== BREAKFAST - BAKERY =====
      { name: 'Vegan Croissant', category: 'Breakfast', subcategory: 'Bakery', price: 3.50, available: true, description: 'Hemp seeds, pomegranate', allergens: 'G' },
      { name: 'Plain Croissant', category: 'Breakfast', subcategory: 'Bakery', price: 1.70, available: true, allergens: 'G,L,E' },
      { name: 'Whole Wheat Croissant', category: 'Breakfast', subcategory: 'Bakery', price: 1.50, available: true, allergens: 'G,L,E' },
      { name: 'Pecan Braid', category: 'Breakfast', subcategory: 'Bakery', price: 1.80, available: true, allergens: 'G,L,E,N' },
      { name: 'Chocolate Croissant', category: 'Breakfast', subcategory: 'Bakery', price: 2.00, available: true, allergens: 'G,L,E' },
      { name: 'Filled Croissant', category: 'Breakfast', subcategory: 'Bakery', price: 3.30, available: true, description: 'Organic jam or hazelnut cream', allergens: 'G,L,E,N' },
      { name: 'Lemon Cream Croissant', category: 'Breakfast', subcategory: 'Bakery', price: 3.00, available: true, allergens: 'G,L,E' },
      { name: 'Mini Croissant', category: 'Breakfast', subcategory: 'Bakery', price: 1.00, available: true, allergens: 'G,L,E' },

      // ===== BREAKFAST - SANDWICH =====
      { name: 'Sandwich', category: 'Breakfast', subcategory: 'Sandwich', price: 5.00, available: true, description: 'Ham & cheese', allergens: 'G,L' },
      { name: 'Brioche Sandwich', category: 'Breakfast', subcategory: 'Sandwich', price: 7.50, available: true, description: 'Vegetables & hummus / Mountain cured ham & provolone / Tuna, datterini tomatoes, mustard', allergens: 'G,L,F' },

      // ===== BREAKFAST - CAKES =====
      { name: 'Organic Tart', category: 'Breakfast', subcategory: 'Cakes', price: 3.50, available: true, allergens: 'G,L,E' },
      { name: 'Chocolate Yogurt & Citrus', category: 'Breakfast', subcategory: 'Cakes', price: 3.50, available: true, allergens: 'G,L' },

      // ===== BREAKFAST - COOKIES =====
      { name: 'Artisan Cookies', category: 'Breakfast', subcategory: 'Cookies', price: 1.50, available: true, description: 'Vanilla & raw cane sugar diamonds / Wine biscuits, rosemary / Dark chocolate & maldon salt / Almond', allergens: 'G,L,E,N' },
    ];

    const results = [];
    let count = 0;
    for (const product of products) {
      const res = await req('POST',
        `/open-apis/bitable/v1/apps/${BASE_ID}/tables/${PRODUCTS_TABLE_ID}/records`,
        { fields: product },
        TOKEN
      );
      count++;
      results.push({
        n: count,
        name: product.name,
        code: res.code,
        msg: res.msg,
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        total: count,
        success: results.filter(r => r.code === 0).length,
        failed: results.filter(r => r.code !== 0).length,
        details: results,
      }, null, 2),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message, stack: e.stack }) };
  }
};
