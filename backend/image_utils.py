"""Image processing per la guida Tierra_Guida_Immagini:
- Converte in WebP (sRGB)
- Ridimensiona secondo il tipo di uso
- Comprime mantenendo qualità alta
"""
from io import BytesIO
from typing import Tuple
from PIL import Image, ImageOps

# Specs dalla guida (desktop): max (w, h) per tipo; l'immagine viene cover-ritagliata a quell'aspect ratio
SPECS: dict[str, Tuple[int, int, str]] = {
    "hero":     (1920, 1080, "16:9"),
    "dish":     (800, 800, "1:1"),
    "interior": (1400, 900, "3:2"),
    "team":     (600, 800, "3:4"),
    "free":     (1600, 1600, "free"),  # max 1600 side, mantiene aspect originale
}


def process_image(data: bytes, usage: str = "dish", quality: int = 82) -> Tuple[bytes, str]:
    """Converte e ottimizza l'immagine. Ritorna (bytes, content_type)."""
    if usage not in SPECS:
        usage = "dish"
    w, h, _ = SPECS[usage]

    img = Image.open(BytesIO(data))
    img = ImageOps.exif_transpose(img)

    # Always convert to RGB (drop alpha if not needed; WebP handles alpha too)
    if img.mode in ("RGBA", "LA"):
        # Preserve alpha
        pass
    else:
        img = img.convert("RGB")

    if usage == "free":
        # Keep aspect, cap longest side
        img.thumbnail((w, h), Image.LANCZOS)
    else:
        # Cover-fit to target aspect
        img = ImageOps.fit(img, (w, h), Image.LANCZOS, centering=(0.5, 0.5))

    buf = BytesIO()
    img.save(buf, format="WEBP", quality=quality, method=6)
    return buf.getvalue(), "image/webp"
