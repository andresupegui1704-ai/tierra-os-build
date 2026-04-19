"""ESC/POS print job builder for Sunmi Cloud Printer (80mm thermal, Wi-Fi/Ethernet/TCP:9100).

Generates a binary ESC/POS payload that the local print agent sends to the printer.
Outputs are returned as base64 so they can be transported over JSON.
"""
import base64
from datetime import datetime
from brand_config import BRAND


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


def build_kitchen_ticket(order: dict) -> bytes:
    """Kitchen copy — NO prices, large font, focus on items + table + allergies."""
    out = bytearray()
    out += INIT
    # Header — big label
    out += ALIGN_CENTER + BOLD_ON + DOUBLE_HW + b"CUCINA\n" + DOUBLE_OFF + BOLD_OFF
    out += ALIGN_CENTER + (BRAND["receipt_header_title"] + "\n").encode("cp858", errors="replace")
    out += LINE
    # Big table/service info
    out += ALIGN_LEFT
    svc = (order.get("service_type") or "").upper()
    table_code = order.get("table_code")
    if table_code:
        out += DOUBLE_HW + BOLD_ON + f"TAVOLO {table_code}\n".encode("cp858", errors="replace") + BOLD_OFF + DOUBLE_OFF
    else:
        svc_label = {"DELIVERY": "CONSEGNA", "ASPORTO": "ASPORTO", "PREORDINE": "PREORDINE"}.get(svc, svc or "ORDINE")
        out += DOUBLE_HW + BOLD_ON + (svc_label + "\n").encode("cp858", errors="replace") + BOLD_OFF + DOUBLE_OFF
    try:
        ts = datetime.fromisoformat(order.get("created_at", "").replace("Z", "+00:00")).strftime("%d/%m %H:%M")
    except Exception:
        ts = order.get("created_at", "")
    out += _line("Ora:", ts)
    out += _line("Ordine:", order.get("id", "")[:8])
    if order.get("waiter"):
        out += _line("Cameriere:", (order.get("waiter") or "")[:28])
    if order.get("customer_name"):
        out += _line("Cliente:", (order.get("customer_name") or "")[:28])
    out += LINE
    # Items (BIG, no prices)
    for it in order.get("items", []):
        qty = it.get("quantity", 1)
        name = f"{qty}x {it['name']}"
        out += BOLD_ON + DOUBLE_HW
        # Wrap for double-width (half the column count → 21)
        while name:
            out += name[:21].encode("cp858", errors="replace") + b"\n"
            name = name[21:]
        out += DOUBLE_OFF + BOLD_OFF
        # Customizations (normal size, indented, no price delta)
        for sel in it.get("customizations") or []:
            gname = sel.get("group_name", "")
            opts = sel.get("option_names") or []
            line = f"  > {gname}: {', '.join(opts)}"
            while line:
                out += line[:42].encode("cp858", errors="replace") + b"\n"
                line = "    " + line[42:] if len(line) > 42 else ""
        out += b"\n"
    out += LINE
    # Notes (HIGHLIGHTED in kitchen — allergies etc.)
    if order.get("notes"):
        out += BOLD_ON + DOUBLE_HW + b"NOTE:\n" + DOUBLE_OFF + BOLD_OFF
        nts = order["notes"]
        while nts:
            out += nts[:42].encode("cp858", errors="replace") + b"\n"
            nts = nts[42:]
    out += FEED_N(3) + CUT
    return bytes(out)


def build_cashier_ticket(order: dict) -> bytes:
    """Cashier copy — full receipt with prices, total, payment status."""
    out = bytearray()
    out += INIT
    out += ALIGN_CENTER + BOLD_ON + b"CASSA\n" + BOLD_OFF
    # Header
    out += ALIGN_CENTER + BOLD_ON + DOUBLE_HW
    out += (BRAND["receipt_header_title"] + "\n").encode("cp858", errors="replace")
    out += DOUBLE_OFF + BOLD_OFF
    out += (BRAND["receipt_header_subtitle"] + "\n").encode("cp858", errors="replace")
    out += (BRAND["receipt_header_address"] + "\n").encode("cp858", errors="replace")
    out += FEED_N(1)
    # Order meta
    out += ALIGN_LEFT + BOLD_ON
    svc = {"delivery": "CONSEGNA", "asporto": "ASPORTO", "preordine": "PREORDINE", "tavolo": "TAVOLO"}.get(order.get("service_type", ""), "ORDINE")
    if order.get("service_type") == "tavolo" and order.get("table_code"):
        out += DOUBLE_HW + f"TAVOLO {order['table_code']}\n".encode("cp858", errors="replace") + DOUBLE_OFF
    else:
        out += DOUBLE_HW + svc.encode("cp858") + b"\n" + DOUBLE_OFF
    out += BOLD_OFF
    out += LINE
    try:
        ts = datetime.fromisoformat(order.get("created_at", "").replace("Z", "+00:00")).strftime("%d/%m/%Y %H:%M")
    except Exception:
        ts = order.get("created_at", "")
    out += _line("Ordine:", order.get("id", "")[:8])
    out += _line("Data:", ts)
    if order.get("customer_name"):
        out += _line("Cliente:", (order.get("customer_name") or "")[:28])
    if order.get("customer_phone"):
        out += _line("Tel:", order.get("customer_phone") or "-")
    if order.get("waiter"):
        out += _line("Cameriere:", (order.get("waiter") or "")[:28])
    if order.get("service_type") == "delivery" and order.get("delivery_address"):
        addr = order["delivery_address"]
        out += b"Indirizzo:\n"
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
        out += BOLD_ON + name[:42].encode("cp858", errors="replace") + b"\n" + BOLD_OFF
        if len(name) > 42:
            out += name[42:].encode("cp858", errors="replace") + b"\n"
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
    out += _line("Subtotale:", f"EUR {order.get('subtotal', 0):.2f}")
    delivery_fee = order.get("total", 0) - order.get("subtotal", 0)
    if delivery_fee > 0.01:
        out += _line("Consegna:", f"EUR {delivery_fee:.2f}")
    out += BOLD_ON + DOUBLE_HW
    out += _line("TOTALE", f"E {order.get('total', 0):.2f}", width=21)
    out += DOUBLE_OFF + BOLD_OFF
    ps = order.get("payment_status", "")
    out += FEED_N(1)
    if ps == "paid":
        out += ALIGN_CENTER + BOLD_ON + b"*** PAGATO ONLINE ***\n" + BOLD_OFF + ALIGN_LEFT
    elif order.get("service_type") == "tavolo":
        out += ALIGN_CENTER + BOLD_ON + b"*** DA RISCUOTERE ***\n" + BOLD_OFF + ALIGN_LEFT
    else:
        out += ALIGN_CENTER + b"Pagamento: " + ps.encode("cp858") + b"\n" + ALIGN_LEFT
    if order.get("notes"):
        out += FEED_N(1) + BOLD_ON + b"NOTE:\n" + BOLD_OFF
        nts = order["notes"]
        while nts:
            out += nts[:42].encode("cp858", errors="replace") + b"\n"
            nts = nts[42:]
    out += FEED_N(3) + CUT
    return bytes(out)


def build_order_ticket(order: dict, copy_label: str = "") -> bytes:
    """Legacy single-copy ticket — kept for backward compatibility. Alias to cashier_ticket."""
    out = bytearray()
    if copy_label:
        out += INIT + ALIGN_CENTER + BOLD_ON + copy_label.encode("cp858") + b"\n" + BOLD_OFF
    out += build_cashier_ticket(order)
    return bytes(out)


def encode_job(order: dict, copies: int = 2, mode: str = "kitchen+cashier") -> str:
    """Return a base64-encoded ESC/POS payload.

    mode:
      - "kitchen+cashier": 1 kitchen ticket (no prices, big font) + 1 cashier ticket (with prices)
      - "legacy": N identical copies labelled "COPIA 1/N ... N/N"
    """
    out = bytearray()
    if mode == "kitchen+cashier":
        out += build_kitchen_ticket(order)
        out += build_cashier_ticket(order)
    else:
        for i in range(copies):
            label = f"COPIA {i + 1}/{copies}" if copies > 1 else ""
            out += build_order_ticket(order, copy_label=label)
    return base64.b64encode(bytes(out)).decode("ascii")
