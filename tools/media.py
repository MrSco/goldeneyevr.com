"""Build the site's images from media-src/ into public/.

    python tools/media.py

Screenshots: every media-src/shots/<name>.jpg becomes
public/img/shots/<name>.webp (1920 wide) and <name>-thumb.webp (800 wide).
Black borders around the capture (the Quest records the whole view, so a
virtual screen or the watch floats in black) are trimmed, then the picture is
padded back out to 16:9 so every tile in the gallery has the same shape.

Brand: the hero, the link-preview card and the icons come from the project's
own art in media-src/art/ (copied from goldeneye-vr/docs/).
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "media-src"
OUT = ROOT / "public"


def trim_black(im, threshold=14, margin=0.04):
    """Crop to the non-black content, with a little breathing room."""
    box = im.convert("L").point(lambda v: 255 if v > threshold else 0).getbbox()
    if not box:
        return im
    l, t, r, b = box
    pad = int(max(r - l, b - t) * margin)
    return im.crop((max(0, l - pad), max(0, t - pad),
                    min(im.width, r + pad), min(im.height, b + pad)))


def to_16x9(im):
    """Pad (never crop) to 16:9 on black."""
    w, h = im.size
    if w * 9 == h * 16:
        return im
    if w * 9 > h * 16:
        nw, nh = w, round(w * 9 / 16)
    else:
        nw, nh = round(h * 16 / 9), h
    canvas = Image.new("RGB", (nw, nh), (0, 0, 0))
    canvas.paste(im, ((nw - w) // 2, (nh - h) // 2))
    return canvas


def fit_width(im, width):
    if im.width <= width:
        return im
    return im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)


def shots():
    dest = OUT / "img" / "shots"
    dest.mkdir(parents=True, exist_ok=True)
    for src in sorted((SRC / "shots").glob("*.jpg")):
        im = to_16x9(trim_black(Image.open(src).convert("RGB")))
        fit_width(im, 1920).save(dest / f"{src.stem}.webp", quality=80, method=6)
        fit_width(im, 800).save(dest / f"{src.stem}-thumb.webp", quality=74, method=6)
        print("shot", src.stem, im.size)


def circle(im):
    """Round mask for the small icons, so the tab icon reads as an iris."""
    size = im.width * 4
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    out = im.convert("RGBA")
    out.putalpha(mask.resize(im.size, Image.LANCZOS))
    return out


def brand():
    art = SRC / "art"
    img = OUT / "img"

    # Hero: the reticle eye, text-free version of the README banner.
    Image.open(art / "banner_source.jpg").convert("RGB").save(
        img / "hero.webp", quality=84, method=6)

    # Link-preview card, 1200x630: the README banner, cropped from the right so
    # its baked-in title stays whole.
    banner = Image.open(art / "banner.png").convert("RGB")
    w = round(banner.height * 1200 / 630)
    banner.crop((0, 0, w, banner.height)).resize((1200, 630), Image.LANCZOS).save(
        img / "og.jpg", quality=86, optimize=True)

    # Icons: the iris and crosshair from the app icon.
    icon = Image.open(art / "icon_source.jpg").convert("RGB")
    iris = icon.crop((332, 248, 932, 848))
    circle(iris.resize((64, 64), Image.LANCZOS)).save(OUT / "favicon-64.png")
    circle(iris.resize((48, 48), Image.LANCZOS)).save(
        OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    icon.resize((180, 180), Image.LANCZOS).save(OUT / "apple-touch-icon.png")
    iris.resize((96, 96), Image.LANCZOS).save(img / "mark.webp", quality=88)
    print("brand done")


if __name__ == "__main__":
    shots()
    brand()
