"""Vectorize the Dirham symbol bitmap and build a one-glyph TTF (U+20C3, also U+E000).

Usage: python build-currency-font.py <dirham.webp> assets/fonts/GymBiosCurrency.ttf
Requires: pip install potracer fonttools pillow numpy
"""
import sys
import numpy as np
from PIL import Image
import potrace
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.areaPen import AreaPen
from fontTools.pens.reverseContourPen import ReverseContourPen
from fontTools.pens.transformPen import TransformPen

src, out = sys.argv[1], sys.argv[2]

im = Image.open(src).convert("RGBA")
# Ink = opaque and dark.
arr = np.asarray(im).astype(np.float32)
alpha = arr[..., 3] / 255.0
lum = arr[..., :3].mean(axis=2) / 255.0
ink = (alpha * (1 - lum)) > 0.5
# Crop to ink bbox, then downscale for tracing speed.
ys, xs = np.where(ink)
ink = ink[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
H0, W0 = ink.shape
target_h = 900
scale_px = target_h / H0
small = Image.fromarray((ink * 255).astype(np.uint8)).resize(
    (round(W0 * scale_px), target_h), Image.LANCZOS)
bm = np.asarray(small) > 127
h, w = bm.shape

path = potrace.Bitmap(~bm).trace(turdsize=4, alphamax=1.0, opticurve=True, opttolerance=0.2)

UPM = 1000
GLYPH_H = 720            # roughly cap height of common UI fonts
SIDE = 50
s = GLYPH_H / h
glyph_w = w * s
advance = round(glyph_w + SIDE + 110)  # a little extra room before the digits

rec = RecordingPen()
# Flip Y (bitmap y-down -> font y-up) and place on the baseline.
tp = TransformPen(rec, (s, 0, 0, -s, SIDE, GLYPH_H))
for curve in path:
    tp.moveTo((curve.start_point.x, curve.start_point.y))
    for seg in curve.segments:
        if seg.is_corner:
            tp.lineTo((seg.c.x, seg.c.y))
            tp.lineTo((seg.end_point.x, seg.end_point.y))
        else:
            tp.curveTo((seg.c1.x, seg.c1.y), (seg.c2.x, seg.c2.y),
                       (seg.end_point.x, seg.end_point.y))
    tp.closePath()

area = AreaPen()
rec.replay(area)

ttpen = TTGlyphPen(None)
target = Cu2QuPen(ttpen, max_err=1.0, reverse_direction=False)
# TrueType wants clockwise outer contours (negative AreaPen area).
if area.value > 0:
    target = ReverseContourPen(target)
rec.replay(target)
dirham = ttpen.glyph()

empty = TTGlyphPen(None).glyph()

fb = FontBuilder(UPM, isTTF=True)
glyph_order = [".notdef", "dirham"]
fb.setupGlyphOrder(glyph_order)
fb.setupCharacterMap({0x20C3: "dirham", 0xE000: "dirham"})
fb.setupGlyf({".notdef": empty, "dirham": dirham})
fb.setupHorizontalMetrics({".notdef": (500, 0), "dirham": (advance, SIDE)})
fb.setupHorizontalHeader(ascent=930, descent=-240)
fb.setupNameTable({"familyName": "GymBiosCurrency", "styleName": "Regular"})
fb.setupOS2(sTypoAscender=930, sTypoDescender=-240, sTypoLineGap=0,
            usWinAscent=930, usWinDescent=240, sCapHeight=GLYPH_H)
fb.setupPost()
fb.save(out)
print(f"bitmap {w}x{h}, curves={len(path)}, advance={advance}, area={area.value:.0f}")
