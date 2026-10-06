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

from PIL import Image

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


# Looping gallery clips: name -> (source in media-src/clips, start s, end s,
# poster frame s). All times are in the source.
# Quest recordings open and close on the system menu, so trim both ends.
CLIPS = {
    "watch-raise": ("watch-raise-src.mp4", 1.0, 5.5, 4.5),
}


def clips():
    """Silent looping MP4s (H.264, plays everywhere) plus a poster frame."""
    import subprocess
    dest = OUT / "img" / "shots"
    for name, (src, start, end, poster_at) in CLIPS.items():
        length = end - start
        vf = (f"fps=30,scale=1280:-2,fade=t=in:st=0:d=0.25,"
              f"fade=t=out:st={length - 0.3:.2f}:d=0.3")
        subprocess.run([
            "ffmpeg", "-v", "error", "-y", "-ss", str(start), "-to", str(end),
            "-i", str(SRC / "clips" / src), "-vf", vf, "-an",
            "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
            "-crf", "26", "-preset", "slow", "-movflags", "+faststart",
            str(dest / f"{name}.mp4")], check=True)
        poster = dest / f"{name}-poster.jpg"
        subprocess.run([
            "ffmpeg", "-v", "error", "-y", "-ss", str(poster_at),
            "-i", str(SRC / "clips" / src), "-frames:v", "1", str(poster)], check=True)
        im = Image.open(poster).convert("RGB")
        fit_width(im, 800).save(dest / f"{name}-poster.webp", quality=76, method=6)
        poster.unlink()
        print("clip", name, f"{length:.1f}s")


def brand():
    art = SRC / "art"
    img = OUT / "img"

    # Hero: suppressed pistol on the golden reticle. The wide frame leaves the
    # left side dark so the headline can sit over it.
    Image.open(art / "hero-pistol.jpg").convert("RGB").save(
        img / "hero.webp", quality=84, method=6)

    # Link-preview card, 1200x630: the README banner, cropped from the right so
    # its baked-in title stays whole.
    banner = Image.open(art / "banner.png").convert("RGB")
    w = round(banner.height * 1200 / 630)
    banner.crop((0, 0, w, banner.height)).resize((1200, 630), Image.LANCZOS).save(
        img / "og.jpg", quality=86, optimize=True)

    # Icons: the square pistol. Kept square so the suppressor is not clipped.
    icon = Image.open(art / "icon-pistol.jpg").convert("RGB")
    icon.resize((64, 64), Image.LANCZOS).save(OUT / "favicon-64.png")
    icon.resize((48, 48), Image.LANCZOS).save(
        OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    icon.resize((180, 180), Image.LANCZOS).save(OUT / "apple-touch-icon.png")
    icon.resize((96, 96), Image.LANCZOS).save(img / "mark.webp", quality=88)

    lobbies = ROOT / "services" / "lobbies" / "public"
    for name in ("favicon-64.png", "favicon.ico", "apple-touch-icon.png"):
        (lobbies / name).write_bytes((OUT / name).read_bytes())
    print("brand done")


if __name__ == "__main__":
    shots()
    clips()
    brand()
