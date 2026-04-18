"""Email service using Resend for Tierra Organic Bistro.

Graceful degradation: if RESEND_API_KEY is not configured or invalid,
emails are logged but the API call doesn't fail.
"""
import os
import asyncio
import logging
import resend

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
RESTAURANT_EMAIL = os.environ.get("RESTAURANT_EMAIL", "")
RESTAURANT_NAME = os.environ.get("RESTAURANT_NAME", "Tierra Organic Bistro")
RESTAURANT_ADDRESS = os.environ.get("RESTAURANT_ADDRESS", "Via Tirso 34, Roma")
RESTAURANT_WHATSAPP = os.environ.get("RESTAURANT_WHATSAPP", "")

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY


def _base_template(title: str, body_html: str) -> str:
    return f"""
<!DOCTYPE html>
<html lang="it">
<body style="margin:0;padding:0;background:#F9F6F0;font-family:Georgia,serif;color:#1C231A;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F6F0;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid rgba(43,74,51,0.12);">
      <tr><td style="background:#2B4A33;padding:32px 40px;">
        <h1 style="margin:0;color:#F9F6F0;font-family:Georgia,serif;font-size:28px;letter-spacing:-0.5px;">Tierra <span style="font-style:italic;color:#C46D46;">Organic Bistro</span></h1>
        <p style="margin:6px 0 0;color:#F1EBE1;font-size:12px;letter-spacing:3px;text-transform:uppercase;">{RESTAURANT_ADDRESS}</p>
      </td></tr>
      <tr><td style="padding:40px;">
        <h2 style="margin:0 0 20px;font-family:Georgia,serif;font-size:24px;color:#1C231A;">{title}</h2>
        {body_html}
      </td></tr>
      <tr><td style="background:#F1EBE1;padding:24px 40px;color:#515E4C;font-size:13px;line-height:1.6;">
        <p style="margin:0;">Grazie di averci scelto.<br/>
        {RESTAURANT_NAME} — {RESTAURANT_ADDRESS}<br/>
        WhatsApp: {RESTAURANT_WHATSAPP}</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>
"""


async def _send(to: str, subject: str, html: str) -> bool:
    if not RESEND_API_KEY or RESEND_API_KEY.startswith("re_test_placeholder"):
        logger.info(f"[EMAIL MOCK] To: {to} | Subject: {subject}")
        return False
    params = {"from": SENDER_EMAIL, "to": [to], "subject": subject, "html": html}
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {to}: {email.get('id')}")
        return True
    except Exception as e:
        logger.error(f"Resend email failed to {to}: {e}")
        return False


async def send_order_confirmation(order: dict) -> None:
    items_rows = "".join(
        f"<tr><td style='padding:8px 0;border-bottom:1px solid #F1EBE1;'>{it['quantity']}× {it['name']}</td>"
        f"<td align='right' style='padding:8px 0;border-bottom:1px solid #F1EBE1;'>€ {it['price']*it['quantity']:.2f}</td></tr>"
        for it in order["items"]
    )
    service_label = {"delivery": "Consegna a domicilio", "asporto": "Asporto", "preordine": "Preordine sul posto"}.get(order["service_type"], order["service_type"])
    addr_block = f"<p><strong>Indirizzo di consegna:</strong> {order.get('delivery_address','')}</p>" if order["service_type"] == "delivery" else ""
    time_block = f"<p><strong>Orario:</strong> {order.get('scheduled_time','')}</p>" if order.get("scheduled_time") else ""
    notes = f"<p><strong>Note:</strong> {order.get('notes','')}</p>" if order.get("notes") else ""

    body = f"""
<p>Ciao <strong>{order['customer_name']}</strong>,</p>
<p>Abbiamo ricevuto il tuo ordine. Ecco il riepilogo:</p>
<p style="background:#F9F6F0;padding:12px 16px;border-radius:8px;"><strong>Tipo servizio:</strong> {service_label}</p>
{addr_block}{time_block}{notes}
<table width="100%" style="margin-top:16px;border-collapse:collapse;">
  {items_rows}
  <tr><td style="padding:14px 0;font-weight:bold;font-size:16px;">Totale</td>
      <td align="right" style="padding:14px 0;font-weight:bold;font-size:16px;color:#2B4A33;">€ {order['total']:.2f}</td></tr>
</table>
<p style="margin-top:24px;">Ti contatteremo su <strong>{order['customer_phone']}</strong> per qualsiasi comunicazione.</p>
"""
    await _send(order["customer_email"], f"Ordine confermato — {RESTAURANT_NAME}", _base_template("Ordine confermato", body))
    if RESTAURANT_EMAIL:
        await _send(RESTAURANT_EMAIL, f"Nuovo ordine da {order['customer_name']}", _base_template("Nuovo ordine ricevuto", body))


async def send_reservation_confirmation(res: dict) -> None:
    body = f"""
<p>Ciao <strong>{res['customer_name']}</strong>,</p>
<p>La tua richiesta di prenotazione è stata registrata. Ti confermeremo al più presto via email o telefono.</p>
<table width="100%" style="margin-top:16px;border-collapse:collapse;">
  <tr><td style="padding:8px 0;color:#515E4C;">Data</td><td align="right" style="padding:8px 0;font-weight:bold;">{res['date']}</td></tr>
  <tr><td style="padding:8px 0;color:#515E4C;">Orario</td><td align="right" style="padding:8px 0;font-weight:bold;">{res['time']}</td></tr>
  <tr><td style="padding:8px 0;color:#515E4C;">Ospiti</td><td align="right" style="padding:8px 0;font-weight:bold;">{res['guests']}</td></tr>
</table>
{f"<p style='margin-top:16px;'><strong>Note:</strong> {res['notes']}</p>" if res.get('notes') else ""}
<p style="margin-top:24px;">Ti aspettiamo in <strong>{RESTAURANT_ADDRESS}</strong>.</p>
"""
    await _send(res["customer_email"], f"Prenotazione ricevuta — {RESTAURANT_NAME}", _base_template("Prenotazione ricevuta", body))
    if RESTAURANT_EMAIL:
        admin_body = body + f"<p><strong>Telefono:</strong> {res['customer_phone']}<br/><strong>Email:</strong> {res['customer_email']}</p>"
        await _send(RESTAURANT_EMAIL, f"Nuova prenotazione: {res['customer_name']} — {res['date']} {res['time']}", _base_template("Nuova prenotazione", admin_body))
