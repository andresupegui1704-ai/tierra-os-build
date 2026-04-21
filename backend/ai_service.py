"""AI-powered invoice analysis for Tierra.

Uses Emergent LLM Key + emergentintegrations library with GPT-5.1 vision
to extract structured data from Italian invoice images.
"""
import os
import re
import json
import logging
from typing import Optional
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

logger = logging.getLogger(__name__)


# Expense categories we support. Keep short, kitchen-friendly labels.
EXPENSE_CATEGORIES = [
    "Alimentari",         # food supplies
    "Bevande",            # drinks/wine suppliers
    "Pesce e carne",      # fresh proteins
    "Frutta e verdura",
    "Pulizia",
    "Utenze",             # electricity, water, gas
    "Affitto",
    "Attrezzature",
    "Manutenzione",
    "Marketing",
    "Servizi",            # software, accounting, legal
    "Personale",
    "Trasporti",
    "Altro",
]

SYSTEM_PROMPT = f"""Sei un assistente esperto nell'estrazione di dati da fatture italiane per un ristorante.

Quando ricevi l'immagine di una fattura/scontrino/ricevuta, rispondi SOLO con un oggetto JSON valido (niente testo prima o dopo) con esattamente questa struttura:

{{
  "fornitore": "nome dell'azienda/venditore o negozio",
  "importo": numero totale in EUR (float, es. 125.50),
  "data": "YYYY-MM-DD della fattura",
  "scadenza": "YYYY-MM-DD di scadenza pagamento (o stessa data se immediato/scontrino)",
  "categoria": "una tra: {', '.join(EXPENSE_CATEGORIES)}",
  "note": "P.IVA, numero documento e altre informazioni rilevanti in italiano (max 200 caratteri)"
}}

REGOLE:
- Tutti i campi sono obbligatori. Se un campo non è visibile nell'immagine, usa null.
- Importo: estrai il TOTALE (IVA inclusa), non il subtotale.
- Se la fattura è a 30gg/60gg, calcola la scadenza di conseguenza dalla data fattura.
- Per scontrini di cassa, scadenza = data.
- Categoria: scegli la più appropriata tra quelle elencate, NON inventarne altre.
- Note: includi P.IVA/C.F. se visibili, numero documento, metodo pagamento se noto.
- Rispondi ESCLUSIVAMENTE con JSON valido, niente markdown, niente backtick, niente commenti."""


async def analyze_invoice(image_base64: str, media_type: str = "image/jpeg") -> dict:
    """Analyze an invoice image and return structured data.

    Args:
        image_base64: Base64-encoded image content (no data:image/... prefix).
        media_type: MIME type (currently informational only; library handles encoding).

    Returns:
        Dict with: fornitore, importo, data, scadenza, categoria, note.
        Each value may be None if not extractable.

    Raises:
        ValueError: if LLM response can't be parsed.
        RuntimeError: if EMERGENT_LLM_KEY is not configured.
    """
    api_key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not api_key:
        raise RuntimeError("EMERGENT_LLM_KEY not configured")

    # Strip any data-URL prefix the caller may have included
    if "," in image_base64 and image_base64.lstrip().startswith("data:"):
        image_base64 = image_base64.split(",", 1)[1]
    image_base64 = image_base64.strip()

    # New chat session per request (as per integration playbook)
    chat = LlmChat(
        api_key=api_key,
        session_id=f"invoice-{os.urandom(4).hex()}",
        system_message=SYSTEM_PROMPT,
    ).with_model("openai", "gpt-5.1")

    user_message = UserMessage(
        text="Analizza questa fattura/scontrino e restituisci i dati in JSON.",
        file_contents=[ImageContent(image_base64=image_base64)],
    )

    response = await chat.send_message(user_message)
    logger.info("Invoice analysis raw response length=%d", len(response or ""))

    # Clean possible markdown fences
    cleaned = response.strip()
    if cleaned.startswith("```"):
        # ```json ... ``` or ``` ... ```
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```\s*$", "", cleaned)

    # Extract JSON object (be defensive)
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON object in LLM response: {cleaned[:200]}")

    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in LLM response: {e} — content: {cleaned[:200]}")

    # Normalize + validate keys
    result = {
        "fornitore": data.get("fornitore"),
        "importo": _safe_float(data.get("importo")),
        "data": data.get("data"),
        "scadenza": data.get("scadenza"),
        "categoria": data.get("categoria") if data.get("categoria") in EXPENSE_CATEGORIES else "Altro",
        "note": data.get("note"),
    }
    return result


def _safe_float(value) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return round(float(value), 2)
    if isinstance(value, str):
        # Handle "1.234,56" or "1234.56" or "€ 12,50"
        cleaned = re.sub(r"[^\d,.\-]", "", value)
        if cleaned.count(",") and cleaned.count("."):
            # Assume it's Italian format "1.234,56"
            cleaned = cleaned.replace(".", "").replace(",", ".")
        else:
            cleaned = cleaned.replace(",", ".")
        try:
            return round(float(cleaned), 2)
        except ValueError:
            return None
    return None
