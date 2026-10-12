#!/usr/bin/env python3
"""P31 only: supervised extraction of BG_SRC source pixels; NOT production approved."""
import base64, io, json, re
from pathlib import Path
import cv2, numpy as np
from PIL import Image, ImageDraw
repo=Path(__file__).resolve().parents[2]
out=repo/'test-mapa-migracion/plants/pilot_output'
out.mkdir(parents=True,exist_ok=True)
html=(repo/'vendor/atria-4.8.6/index.html').read_text()
match=re.search(r'const BG_SRC="data:image/webp;base64,([^"]+)"',html)
if not match:raise RuntimeError('Original BG_SRC missing')
source=Image.open(io.BytesIO(base64.b64decode(match.group(1)))).convert('RGB')
assert source.size==(1024,1536)
x0,y0,w,h=288,905,68,115
crop=source.crop((x0,y0,x0+w,y0+h))
rgb=np.array(crop); Y,X=np.mgrid[:h,:w]
fol=np.array([[16,31],[20,29],[26,29],[29,28],[30,25],[33,23],[36,24],[39,29],[42,32],[46,30],[49,31],[50,33],[49,37],[46,40],[51,41],[54,44],[54,47],[50,51],[52,54],[52,57],[48,59],[44,59],[42,62],[38,64],[33,64],[28,62],[25,60],[21,60],[18,59],[15,58],[14,54],[14,48],[15,44],[19,41],[20,37],[17,35]],np.int32)
clip=np.zeros((h,w),np.uint8);cv2.fillPoly(clip,[fol],255)
hsv=cv2.cvtColor(rgb,cv2.COLOR_RGB2HSV)
green=(hsv[:,:,0]>=25)&(hsv[:,:,0]<=95)&(hsv[:,:,1]>=48)&(hsv[:,:,2]>=22)&(clip>0)
seed=cv2.morphologyEx(green.astype('uint8'),cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(3,3)))
area=cv2.morphologyEx(cv2.dilate(seed,np.ones((3,3),np.uint8)),cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(3,3)))
leaves=np.where((area>0)&(clip>0)&(Y<=64),255,0).astype('uint8')
blue=(hsv[:,:,0]>=96)&(hsv[:,:,0]<=136)&(hsv[:,:,1]>48)
leaves[blue]=0
# Retain original dark leaf edges adjacent to green, but reject blue wall.
near=cv2.dilate(green.astype('uint8'),cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)))>0
legacy_guess=np.array(Image.open(repo/'test-mapa-migracion/plants/output/P31.png').convert('RGBA'))[:,:,3] if (repo/'test-mapa-migracion/plants/output/P31.png').exists() else np.zeros((h,w),np.uint8)
if legacy_guess.shape==(h,w):
    leaves[(legacy_guess>100)&near&(clip>0)&(Y<=60)&(~blue)]=255
potpoly=np.array([[23,59],[27,57],[32,57],[37,58],[43,59],[46,61],[48,64],[48,70],[48,76],[47,82],[44,86],[40,89],[36,90],[31,90],[27,89],[23,87],[21,84],[20,80],[20,76],[20,70],[20,65],[21,62]],np.int32)
pot=np.zeros((h,w),np.uint8);cv2.fillPoly(pot,[potpoly],255)
combined=cv2.max(leaves,pot)
n,l,stats,_=cv2.connectedComponentsWithStats((combined>0).astype('uint8'),8)
kept=np.zeros_like(combined)
for k in range(1,n):
    if stats[k,cv2.CC_STAT_AREA]>=6:kept[l==k]=255
alpha=cv2.GaussianBlur(kept,(3,3),.47);alpha[kept>0]=255
fa=cv2.GaussianBlur(leaves,(3,3),.47);fa[leaves>0]=255
rgba=np.dstack([rgb,alpha]); frgba=np.dstack([rgb,fa])
Image.fromarray(rgba,'RGBA').save(out/'plant_P31.png')
Image.fromarray(frgba,'RGBA').save(out/'plant_P31_foliage.png')
Image.fromarray(alpha).save(out/'plant_P31_alpha_mask.png')
crop.save(out/'plant_P31_original_crop.png')
meta={
 'id':'P31','status':'VISUAL_QA_REQUIRED_NOT_APPROVED','original_map_px':[1024,1536],
 'source_bbox':[288,905,68,115],'width_px':68,'height_px':115,
 'source_x':288,'source_y':905,'anchor_x':34,'anchor_y':90,
 'world_anchor':[322,995],'depth_anchor':[322,995],
 'collision_mask_base':{'type':'ellipse','center_world_px':[322,988],
  'radius_px':[13,7],'blocks_movement':True,'provisional':True},
 'passable_upper_foliage':True,
 'occluder_region':{'sprite':'plant_P31_foliage.png','passable':True},
 'repeated_instances':[],'source_rgb_unchanged':True,
 'method':'hand-guided silhouette with HSV color seeding and manually audited pot outline; no generated pixels',
 'limit':'Left-wall contact ambiguous; needs visual signoff before clinical map integration.'
}
(out/'plant_P31_metadata.json').write_text(json.dumps(meta,indent=2))
assert np.array_equal(rgba[:,:,:3],rgb)
assert rgba.shape==(115,68,4)
# QA montage: original, checkerboard, dark backing, alpha, overlay contour.
checker=Image.new('RGBA',(w,h),(223,225,225,255))
d=ImageDraw.Draw(checker)
for yy in range(0,h,7):
 for xx in range(0,w,7):
  if (xx//7+yy//7)%2:d.rectangle((xx,yy,xx+6,yy+6),fill=(190,194,194,255))
checker.alpha_composite(Image.fromarray(rgba,'RGBA'))
dark=Image.new('RGBA',(w,h),(32,50,58,255));dark.alpha_composite(Image.fromarray(rgba,'RGBA'))
outline=rgb.copy();edges=cv2.Canny(alpha,100,150)>0;outline[edges]=[255,45,45]
images=[crop,checker.convert('RGB'),dark.convert('RGB'),Image.fromarray(alpha).convert('RGB'),Image.fromarray(outline)]
scale=6; plate=Image.new('RGB',(5*(w*scale+12),h*scale+32),'white')
for i,im in enumerate(images):plate.paste(im.resize((w*scale,h*scale),Image.Resampling.NEAREST),(i*(w*scale+12),27))
plate.save(out/'plant_P31_validation.png')
print('P31 CHECKPOINT: output files created; segmentation awaits independent visual approval')
