/** One cached palette for the existing green source. Only green cloth pixels
 * change; skin, mask, black outlines, cyan details and alpha stay intact. */
export function navyScrubPixels(pixels){
 const out=new Uint8ClampedArray(pixels);
 for(let i=0;i<out.length;i+=4){const r=out[i],g=out[i+1],b=out[i+2];
  if(out[i+3]&&g-r>=10&&g-b>=5&&g>r*1.3){out[i]=Math.round(r*.8);out[i+1]=Math.round(g*.75);out[i+2]=Math.round(Math.min(255,g*1.55));}
 }
 return out;
}
export function createNavyAvatar(image,document){
 const canvas=document.createElement('canvas');canvas.width=image.naturalWidth||image.width;canvas.height=image.naturalHeight||image.height;
 const ctx=canvas.getContext('2d');
 if(!ctx?.getImageData||!ctx?.putImageData)return image;
 ctx.drawImage(image,0,0);const data=ctx.getImageData(0,0,canvas.width,canvas.height);
 data.data.set(navyScrubPixels(data.data));ctx.putImageData(data,0,0);return canvas;
}
