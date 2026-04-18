"""ESC/POS print job builder for Sunmi Cloud Printer (80mm thermal, Wi-Fi/Ethernet/TCP:9100).

Generates a binary ESC/POS payload that the local print agent sends to the printer.
Outputs are returned as base64 so they can be transported over JSON.
"""
import base64
from datetime import datetime


# ESC/POS control codes
ESC = b"\x1b"
GS = b"\x1d"
INIT = ESC + b"@"                  # Initialize
ALIGN_CENTER = ESC + b"a\x01"
ALIGN_LEFT = ESC + b"a\x00"
BOLD_ON = ESC + b"E\x01"
BOLD_OFF = ESC + b"E\x00"
DOUBLE_HW = GS + b"!\x11"          # double width + height
DOUBLE_OFF = GS + b"!\x00"
LINE = b"-" * 42 + b"\n"
FEED_N = lambda n: ESC + b"d" + bytes([n])  # noqa: E731
CUT = GS + b"V\x42\x00"            # partial cut
CASHDRAW = b""                     # not used


def _line(left: str, right: str, width: int = 42) -> bytes:
    left_b = left.encode("cp858", errors="replace")
    right_b = right.encode("cp858", errors="replace")
    pad = width - len(left_b) - len(right_b)
    if pad < 1:
        return left_b + b" " + right_b + b"\n"
    return left_b + b" " * pad + right_b + b"\n"


def build_order_ticket(order: dict, copy_label: str = "") -> bytes:
    """Build a restaurant order ticket (comanda)."""
    out = bytearray()
    out += INIT
    # Copy label (if provided, e.g. "COPIA 1/2")
    if copy_label:
        out += ALIGN_CENTER + BOLD_ON + copy_label.encode("cp858") + b"\n" + BOLD_OFF
    # Header
    out += ALIGN_CENTER + BOLD_ON + DOUBLE_HW
    out += b"TIERRA\n"
    out += DOUBLE_OFF + BOLD_OFF
    out += b"Organic Bistrot Cafe\n"
    out += b"Via Tirso 34 - Roma\n"
    out += FEED_N(1)
    # Order meta
    out += ALIGN_LEFT + BOLD_ON
    svc = {"delivery": "CONSEGNA", "asporto": "ASPORTO", "preordine": "PREORDINE TAVOLO"}.get(order.get("service_type", ""), "ORDINE")
    out += DOUBLE_HW + svc.encode("cp858") + b"\n" + DOUBLE_OFF + BOLD_OFF
    out += LINE
    # Try to parse created_at ISO → short datetime
    try:
        ts = datetime.fromisoformat(order.get("created_at", "").replace("Z", "+00:00")).strftime("%d/%m/%Y %H:%M")
    except Exception:
        ts = order.get("created_at", "")
    out += _line("Ordine:", order.get("id", "")[:8])
    out += _line("Data:", ts)
    out += _line("Cliente:", (order.get("customer_name") or "")[:28])
    out += _line("Tel:", order.get("customer_phone") or "-")
    if order.get("service_type") == "delivery" and order.get("delivery_address"):
        addr = order["delivery_address"]
        out += b"Indirizzo:\n"
        # wrap to 42 cols
        while addr:
            out += addr[:42].encode("cp858", errors="replace") + b"\n"
            addr = addr[42:]
    if order.get("scheduled_time"):
        out += _line("Orario:", order["scheduled_time"][:28])
    out += LINE
    # Items
    out += BOLD_ON + b"PIATTI\n" + BOLD_OFF
    out += LINE
    for it in order.get("items", []):
        name = f"{it['quantity']}x {it['name']}"
        unit = it.get('unit_price') if it.get('unit_price') is not None else it['price']
        total = (it.get('line_total') if it.get('line_total') is not None else unit * it['quantity'])
        price_line = f"EUR {total:.2f}"
        # Print name (wrap) and total
        out += BOLD_ON + name[:42].encode("cp858", errors="replace") + b"\n" + BOLD_OFF
        if len(name) > 42:
            out += name[42:].encode("cp858", errors="replace") + b"\n"
        # Customizations (indented)
        for sel in it.get("customizations") or []:
            gname = sel.get("group_name", "")
            opts = sel.get("option_names") or []
            delta = sel.get("price_delta") or 0.0
            line = f"  - {gname}: {', '.join(opts)}"
            while line:
                out += line[:42].encode("cp858", errors="replace") + b"\n"
                line = "    " + line[42:] if len(line) > 42 else ""
            if delta > 0.01:
                out += _line("", f"+ EUR {delta:.2f}")
        out += _line("", price_line)
    out += LINE
    # Totals
    out += _line("Subtotale:", f"EUR {order.get('subtotal', 0):.2f}")
    delivery_fee = order.get("total", 0) - order.get("subtotal", 0)
    if delivery_fee > 0.01:
        out += _line("Consegna:", f"EUR {delivery_fee:.2f}")
    out += BOLD_ON + DOUBLE_HW
    out += _line("TOTALE", f"E {order.get('total', 0):.2f}", width=21)
    out += DOUBLE_OFF + BOLD_OFF
    # Payment status
    ps = order.get("payment_status", "")
    out += FEED_N(1)
    if ps == "paid":
        out += ALIGN_CENTER + BOLD_ON + b"*** PAGATO ONLINE ***\n" + BOLD_OFF + ALIGN_LEFT
    else:
        out += ALIGN_CENTER + b"Pagamento: " + ps.encode("cp858") + b"\n" + ALIGN_LEFT
    # Notes
    if order.get("notes"):
        out += FEED_N(1) + BOLD_ON + b"NOTE:\n" + BOLD_OFF
        nts = order["notes"]
        while nts:
            out += nts[:42].encode("cp858", errors="replace") + b"\n"
            nts = nts[42:]
    out += FEED_N(3) + CUT
    return bytes(out)


def encode_job(order: dict, copies: int = 2) -> str:
    """Return a base64-encoded ESC/POS payload with N labelled copies (default 2: kitchen + counter)."""
    out = bytearray()
    for i in range(copies):
        label = f"COPIA {i + 1}/{copies}" if copies > 1 else ""
        out += build_order_ticket(order, copy_label=label)
    return base64.b64encode(bytes(out)).decode("ascii")
