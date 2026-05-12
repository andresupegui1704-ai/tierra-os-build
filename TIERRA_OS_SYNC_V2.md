# TIERRA OS SYNC v2 - BIDIRECTIONAL ARCHITECTURE
Last Updated: May 13, 2026
Status: Implementation Ready

## OVERVIEW
Tierra Bistro (Menu Site) ↔ Tierra OS (POS/Kitchen)

## DATA FLOW
Menu Site → POST /api/tierra/orders
  ↓
Tierra OS → POST /.netlify/functions/lark-orders
  ↓
Lark → Orders table entry
  ↓
Print → receipt + kitchen label
  ↓
OS UI → order confirmed

## IDEMPOTENCY
Every POST includes: X-Idempotency-Key: {uuid}
Same key = same response (no duplicate)

## ENV VARS
LARK_ORDERS_TABLE_ID=(create this)
SUNMI_PRINTER_IP=192.168.1.100
SUNMI_PRINTER_PORT=9100

Status: Ready to implement
