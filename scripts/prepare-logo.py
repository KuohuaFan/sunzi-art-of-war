#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageOps

SOURCE = Path("/home/ubuntu/upload/IMG_8468.JPG")
OUTPUT = Path("/home/ubuntu/sunzi-art-of-war/client/public/brand")

OUTPUT.mkdir(parents=True, exist_ok=True)
source = Image.open(SOURCE).convert("RGB")
size = max(source.size)
background = Image.new("RGB", (size, size), (236, 244, 250))
background.paste(source, ((size - source.width) // 2, (size - source.height) // 2))

for pixels, filename in [
    (512, "sunzi-logo-512.png"),
    (180, "apple-touch-icon.png"),
    (64, "favicon-64.png"),
    (32, "favicon-32.png"),
]:
    image = ImageOps.fit(background, (pixels, pixels), method=Image.Resampling.LANCZOS)
    image.save(OUTPUT / filename, format="PNG", optimize=True, compress_level=9)

background.save(OUTPUT / "sunzi-logo-source.png", format="PNG", optimize=True, compress_level=9)
print("\n".join(str(path) for path in sorted(OUTPUT.glob("*.png"))))
