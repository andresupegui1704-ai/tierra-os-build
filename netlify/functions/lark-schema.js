// netlify/functions/lark-schema.js
// Legge la schema completa di Lark Base (tabelle + campi)
// Cache: 1 ora

const FEISHU_HOST = 'open.feishu.cn';
const BASE_ID = 'DWpvwpxsViYlMskDFr6jrUccpug';
const CACHE_DURATION = 3600000; // 1 ora in ms

let cachedSchema = null;
let cacheTimestamp = null;

async function getAccessToken(appId, appSecret) {
  try {
    const response = await fetch(`https://${FEISHU_HOST}/open-apis/auth/v3/tenant_access_token/internal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: appId,
        app_secret: appSecret,
      }),
    });

    if (!response.ok) {
      throw new Error(`Auth failed: ${response.status}`);
    }

    const data = await response.json();
    if (data.code !== 0) {
      throw new Error(`Lark API error: ${data.msg}`);
    }

    return data.tenant_access_token;
  } catch (error) {
    console.error('Error getting access token:', error.message);
    throw error;
  }
}

async function getTables(accessToken) {
  try {
    const response = await fetch(
      `https://${FEISHU_HOST}/open-apis/bitable/v1/apps/${BASE_ID}/tables`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch tables: ${response.status}`);
    }

    const data = await response.json();
    if (data.code !== 0) {
      throw new Error(`Lark API error: ${data.msg}`);
    }

    return data.data.items || [];
  } catch (error) {
    console.error('Error fetching tables:', error.message);
    throw error;
  }
}

async function getTableFields(accessToken, tableId) {
  try {
    const response = await fetch(
      `https://${FEISHU_HOST}/open-apis/bitable/v1/apps/${BASE_ID}/tables/${tableId}/fields`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch fields: ${response.status}`);
    }

    const data = await response.json();
    if (data.code !== 0) {
      throw new Error(`Lark API error: ${data.msg}`);
    }

    return data.data.items || [];
  } catch (error) {
    console.error(`Error fetching fields for table ${tableId}:`, error.message);
    return [];
  }
}

async function getSchema(appId, appSecret) {
  try {
    // Check cache
    if (cachedSchema && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
      console.log('Returning cached schema');
      return cachedSchema;
    }

    const accessToken = await getAccessToken(appId, appSecret);
    const tables = await getTables(accessToken);

    const schema = {
      baseId: BASE_ID,
      timestamp: new Date().toISOString(),
      tables: [],
    };

    for (const table of tables) {
      const fields = await getTableFields(accessToken, table.table_id);

      schema.tables.push({
        tableId: table.table_id,
        tableName: table.name,
        fieldCount: fields.length,
        fields: fields.map((field) => ({
          fieldId: field.field_id,
          fieldName: field.field_name,
          fieldType: field.type,
          property: field.property,
        })),
      });
    }

    // Cache the result
    cachedSchema = schema;
    cacheTimestamp = Date.now();

    return schema;
  } catch (error) {
    console.error('Error getting schema:', error);
    throw error;
  }
}

async function handler(event, context) {
  try {
    const appId = process.env.LARK_APP_ID || 'cli_a96eb75ba5e1de17';
    const appSecret = process.env.LARK_APP_SECRET;

    if (!appSecret) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'LARK_APP_SECRET not configured' }),
      };
    }

    const schema = await getSchema(appId, appSecret);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schema, null, 2),
    };
  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        details: error.stack,
      }),
    };
  }
}

module.exports = { handler };
