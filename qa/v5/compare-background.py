"""Compare original lobby background in the same Pixel 5 viewport/camera.

HUD, transcript and player area are outside these regions. This is deliberately
not a certification of the still-unmigrated clinical panels or multiplayer.
"""
import json
import sys
from pathlib import Path
from PIL import Image, ImageChops, ImageStat

reference, candidate = [Image.open(p).convert("RGB") for p in sys.argv[1:3]]
assert reference.size == candidate.size, "reference and candidate viewports differ"
w, h = reference.size
regions = [(0, round(h * .09), w, round(h * .40)),
           (0, round(h * .54), w, round(h * .82))]
results = []
for box in regions:
    diff = ImageChops.difference(reference.crop(box), candidate.crop(box))
    error = max(ImageStat.Stat(diff).mean)
    results.append({"region": box, "maximum_mean_channel_error": error,
                    "allowed_channel_error": 1.0})
    assert error <= 1.0, f"original lobby background drift: {error} > 1/255"
report = {"scope": "same-camera original lobby background only", "regions": results,
          "physicalAndroid": False, "completeVisualParity": False}
Path(sys.argv[3]).write_text(json.dumps(report, indent=2) + "\n")
print("V5 ORIGINAL BACKGROUND PASS", json.dumps(results))
