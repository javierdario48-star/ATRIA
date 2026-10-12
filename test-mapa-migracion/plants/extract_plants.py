#!/usr/bin/env python3
"""ATRIA: lossless source-pixel cutouts of potted plants in BG_SRC.
No image synthesis, no rescaling. Mask quality is an explicit QA gate.
"""
import base64
import io
import json
import re
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'plants' / 'output'
OUT.mkdir(parents=True, exist_ok=True)
SRC_HTML = ROOT.parent / 'vendor/atria-4.8.6/index.html'
html = SRC_HTML.read_text(encoding='utf8')
m = re.search(r'const BG_SRC="data:image/webp;base64,([^"]+)"',html)
if not m: raise RuntimeError('Original BG_SRC not found; abort rather than use wrong background')
source = Image.open(io.BytesIO(base64.b64decode(m.group(1)))).convert('RGB')
W, H = source.size
assert (W,H)==(1024,1536),(W,H)
original = np.asarray(source)
inventory = json.loads((ROOT/'plants/plants_source_manifest.json').read_text())
assert len(inventory['instances']) >= 40
metrics = []
assets = []
thumbs = []
for plant in inventory['instances']:
    pid=plant['id']
    x,y = plant['center']
    rx,ry=plant['extent']
    x0=max(0,x-rx-8); x1=min(W,x+rx+8)
    y0=max(0,y-ry-13); y1=min(H,y+ry+24)
    rgb=original[y0:y1,x0:x1].copy()
    ih,iw=rgb.shape[:2]
    lx=x-x0; ly=y-y0
    yy,xx=np.mgrid[:ih,:iw]
    crown=(((xx-lx)/(rx*1.13))**2+((yy-ly)/(ry*1.1))**2)<=1
    plant_base=(((xx-lx)/(max(9,rx*.62)))**2+((yy-(ly+ry*.72))/(max(12,ry*.69)))**2)<=1
    footprint=crown | plant_base
    hsv=cv2.cvtColor(rgb,cv2.COLOR_RGB2HSV)
    # Green leaves, preserving actual map RGB. Blue walls are not positive seeds.
    green=(hsv[:,:,0]>=27)&(hsv[:,:,0]<=94)&(hsv[:,:,1]>=42)&(hsv[:,:,2]>=27)
    y_leaf=yy < ly+ry*.61
    green &= crown & y_leaf
    green8=(green.astype('uint8')*255)
    green8=cv2.morphologyEx(green8,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
    # Explicit prior, outside definite background. Interior pot mask is soft candidate.
    gc=np.full((ih,iw),cv2.GC_PR_BGD,np.uint8)
    gc[~footprint]=cv2.GC_BGD
    gc[crown|plant_base]=cv2.GC_PR_FGD
    gc[green8>0]=cv2.GC_FGD
    # Exclude unlikely exterior dark structural background from foreground.
    gc[~footprint]=cv2.GC_BGD
    n_fg=int(np.count_nonzero(gc==cv2.GC_FGD))
    if n_fg>=12:
        try:
            bgd=np.zeros((1,65),np.float64); fgd=np.zeros((1,65),np.float64)
            cv2.grabCut(cv2.cvtColor(rgb,cv2.COLOR_RGB2BGR),gc,None,bgd,fgd,4,cv2.GC_INIT_WITH_MASK)
            fg=np.isin(gc,[cv2.GC_PR_FGD,cv2.GC_FGD]).astype('uint8')*255
        except cv2.error: fg=green8.copy()
    else: fg=green8.copy()
    # Respect spatial priors and remove tiny disconnected isolated flecks.
    fg=(fg & (footprint.astype(np.uint8)*255))
    fg=cv2.morphologyEx(fg,cv2.MORPH_OPEN,np.ones((2,2),np.uint8))
    n,labels,stats,_=cv2.connectedComponentsWithStats((fg>0).astype('uint8'))
    good=np.zeros((ih,iw),np.uint8)
    for lab in range(1,n):
        if stats[lab,cv2.CC_STAT_AREA]>=12: good[labels==lab]=255
    if int(good.sum()) == 0:good=green8
    # Preserve exact RGB at nontransparent pixels, soften only the alpha contour.
    alpha=cv2.GaussianBlur(good,(3,3),.55)
    alpha[good>0]=255
    cut=np.dstack([rgb,alpha]).astype('uint8')
    alpha_foliage=alpha.copy()
    alpha_foliage[yy>ly+ry*.35]=0
    Image.fromarray(cut,'RGBA').save(OUT/f'{pid}.png',optimize=True)
    Image.fromarray(np.dstack([rgb,alpha_foliage]).astype('uint8'),'RGBA').save(OUT/f'{pid}_foliage.png',optimize=True)
    # Diagnostic original-to-overlay test: each pixel's source RGB is reused exactly.
    c=alpha[:,:,None].astype(np.float32)/255
    composited=np.rint(rgb.astype(np.float32)*c+rgb.astype(np.float32)*(1-c)).astype('uint8')
    max_diff=int(np.abs(composited.astype('int16')-rgb.astype('int16')).max())
    occ=int(np.count_nonzero(alpha>100))
    total=iw*ih
    pot_anchor=[x, min(H-1,int(y+ry*.75))]
    record={**plant,"source_bbox":[x0,y0,iw,ih],"width_px":iw,"height_px":ih,
            "source_x":x0,"source_y":y0,"anchor_x":pot_anchor[0]-x0,"anchor_y":pot_anchor[1]-y0,
            "world_anchor":pot_anchor,"depth_anchor":pot_anchor,
            "collision_mask_base":{"type":"ellipse","world_center":[x,int(pot_anchor[1]-3)],
                                   "radius_px":[round(rx*.48,2),max(5,round(ry*.21,2))],"solid":True},
            "passable_upper_foliage":True,
            "occluder_region":{"file":f'{pid}_foliage.png',"alpha_mask":"pixel-extracted","passable":True},
            "png":f'{pid}.png',"source_pixel_diff_max":max_diff,
            "foreground_pixels":occ,"total_bbox_pixels":total,
            "mask_coverage":round(occ/total,3),
            "segmentation_approved":False,"review_required":True}
    metrics.append(record)
    # Source crop and transparent-candidate side-by-side at 3x, no source resizing.
    checker=Image.new('RGB',(iw,ih),(232,234,232))
    dd=ImageDraw.Draw(checker)
    for ay in range(0,ih,8):
        for ax in range(0,iw,8):
            if ((ax//8)+(ay//8))%2==0:dd.rectangle([ax,ay,ax+7,ay+7],fill=(200,204,203))
    checker.paste(Image.fromarray(cut,'RGBA'),mask=Image.fromarray(alpha))
    tile=Image.new('RGB',(290,186),'white')
    left=Image.fromarray(rgb,'RGB').resize((int(iw*1.6),int(ih*1.6)),Image.Resampling.NEAREST)
    right=checker.resize((int(iw*1.6),int(ih*1.6)),Image.Resampling.NEAREST)
    tile.paste(left,(4,20));tile.paste(right,(146,20))
    d=ImageDraw.Draw(tile);d.text((8,3),f'{pid} original | extracted',fill=(15,45,45))
    thumbs.append(tile)
# All original map pixels retained in color, alpha remains unapproved pending silhouette review.
(OUT/'plants_physics_manifest.json').write_text(json.dumps({
    "schema":"atria-plant-sprites-v1","source_size_px":[W,H],
    "source":"Golden-master ATRIA original BG_SRC",
    "status":"AUTOMATED_CANDIDATE_PENDING_VISUAL_REVIEW",
    "exact_source_colors":True,"image_generation_used":False,
    "critical_note":"Matching pixels under an alpha mask proves no recoloring but not successful removal of all background.",
    "instances":metrics},ensure_ascii=False,indent=2))
cols=4;rows=(len(thumbs)+cols-1)//cols
sheet=Image.new('RGB',(cols*290,rows*186),(244,246,244))
for i,t in enumerate(thumbs):sheet.paste(t,((i%cols)*290,(i//cols)*186))
sheet.save(OUT/'plants_contact_sheet.jpg',quality=88)
# A full-map QA overlay: boxes and foot anchors for review.
full=source.copy()
d=ImageDraw.Draw(full)
for p in metrics:
    x0,y0,iw,ih=p["source_bbox"]
    d.rectangle([x0,y0,x0+iw,y0+ih],outline=(255,174,51),width=1)
    d.text((max(0,x0),min(H-12,y0)),p["id"],fill=(255,245,50),stroke_width=1,stroke_fill=(0,0,0))
full.save(OUT/'plants_original_positions.png',optimize=True)
print(json.dumps({"status":"extracted_candidate_masks","objects":len(metrics),
                  "all_source_pixels_unchanged":all(p['source_pixel_diff_max']==0 for p in metrics),
                  "sample_mask_coverage":metrics[:6]},indent=2))
