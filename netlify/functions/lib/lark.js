// netlify/functions/lib/lark.js
// Tierra OS v9.5 - Lark Open API client

const LARK_APP_ID = process.env.LARK_APP_ID;
const LARK_APP_SECRET = process.env.LARK_APP_SECRET;
const LARK_BASE_ID = process.env.LARK_BASE_ID;
const LARK_HOST = 'https://open.larksuite.com';

let tokenCache = { token: null, expiresAt: 0 };

console.log('[lark] Module loaded. LARK_APP_ID:', LARK_APP_ID ? 'present' : 'MISSING');
console.log('[lark] LARK_HOST:', LARK_HOST);
console.log('[lark] LARK_BASE_ID:', LARK_BASE_ID ? LARK_BASE_ID.substring(0, 8) + '...' : 'MISSING');

async function getTenantToken() {
  const now = Date.now();
  if (tokenCache.token && tokenCache.expiresAt > now + 60000) {
    return tokenCache.token;
  }
  if (!LARK_APP_ID || !LARK_APP_SECRET) {
    throw new Error('LARK_APP_ID or LARK_APP_SECRET not configured');
  }
  const res = await fetch(LARK_HOST + '/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: LARK_APP_ID, app_secret: LARK_APP_SECRET }),
  });
  const bodyText = await res.text();
  let data;
  try { data = JSON.parse(bodyText); }
  catch (e) { throw new Error('Token response not JSON: ' + bodyText.substring(0, 200)); }
  console.log('[getTenantToken] status=' + res.status + ' code=' + data.code + ' msg=' + data.msg);
  if (data.code !== 0) throw new Error('Lark auth failed: code=' + data.code + ' msg=' + data.msg);
  tokenCache = { token: data.tenant_access_token, expiresAt: now + (data.expire * 1000) };
  return tokenCache.token;
}

async function searchRecords(tableId, filterOrPayload, pageSize) {
  if (pageSize === undefined) pageSize = 100;
  if (filterOrPayload === undefined) filterOrPayload = {};
  const token = await getTenantToken();
  let body;
  if (typeof filterOrPayload === 'string') {
    body = { page_size: pageSize };
  } else if (filterOrPayload && typeof filterOrPayload === 'object') {
    body = Object.assign({ page_size: filterOrPayload.page_size || pageSize }, filterOrPayload);
  } else {
    body = { page_size: pageSize };
  }
  const url = LARK_HOST + '/open-apis/bitable/v1/apps/' + LARK_BASE_ID + '/tables/' + tableId + '/records/search';
  console.log('[searchRecords] POST ' + url);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  const bodyText = await res.text();
  let data;
  try { data = JSON.parse(bodyText); }
  catch (e) {
    console.error('[searchRecords] Not JSON. status=' + res.status + ' body=' + bodyText.substring(0, 300));
    throw new Error('searchRecords response not JSON (status=' + res.status + ')');
  }
  console.log('[searchRecords] status=' + res.status + ' code=' + data.code + ' msg=' + data.msg);
  if (data.code !== 0) throw new Error('Lark search error code=' + data.code + ' msg=' + data.msg);
  return (data.data && data.data.items) || [];
}

async function getRecord(tableId, recordId) {
  const token = await getTenantToken();
  const url = LARK_HOST + '/open-apis/bitable/v1/apps/' + LARK_BASE_ID + '/tables/' + tableId + '/records/' + recordId;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
  });
  const bodyText = await res.text();
  let data;
  try { data = JSON.parse(bodyText); }
  catch (e) { throw new Error('getRecord response not JSON'); }
  if (data.code !== 0) throw new Error('Lark get record error code=' + data.code);
  return data.data.record;
}

async function createRecord(tableId, fields) {
  const token = await getTenantToken();
  const url = LARK_HOST + '/open-apis/bitable/v1/apps/' + LARK_BASE_ID + '/tables/' + tableId + '/records';
  console.log('[createRecord] POST ' + url);
  console.log('[createRecord] fields=' + Object.keys(fields).join(','));
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ fields: fields }),
  });
  const bodyText = await res.text();
  let data;
  try { data = JSON.parse(bodyText); }
  catch (e) {
    console.error('[createRecord] Not JSON. status=' + res.status + ' body=' + bodyText.substring(0, 300));
    throw new Error('createRecord response not JSON');
  }
  console.log('[createRecord] status=' + res.status + ' code=' + data.code + ' msg=' + data.msg);
  if (data.code !== 0) throw new Error('Lark create error code=' + data.code + ' msg=' + data.msg);
  return data.data.record;
}

async function updateRecord(tableId, recordId, fields) {
  const token = await getTenantToken();
  const url = LARK_HOST + '/open-apis/bitable/v1/apps/' + LARK_BASE_ID + '/tables/' + tableId + '/records/' + recordId;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ fields: fields }),
  });
  const bodyText = await res.text();
  let data;
  try { data = JSON.parse(bodyText); }
  catch (e) { throw new Error('updateRecord response not JSON'); }
  if (data.code !== 0) throw new Error('Lark update error code=' + data.code);
  return data.data.record;
}

function toLarkDate(date) {
  return Math.floor(date.getTime() / 1000);
}

module.exports = {
  getTenantToken: getTenantToken,
  searchRecords: searchRecords,
  getRecord: getRecord,
  createRecord: createRecord,
  updateRecord: updateRecord,
  toLarkDate: toLarkDate,
};
