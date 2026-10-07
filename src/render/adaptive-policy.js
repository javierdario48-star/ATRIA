export function chooseRenderPolicy({fps=60,p95=16,longFrames=0,mobile=false}={}){
 if(p95>=80||fps<20)return{renderHz:20,quality:'low'};
 if(p95>=45||fps<28)return{renderHz:mobile?24:30,quality:'reduced'};
 return{renderHz:mobile?30:60,quality:'full'};
}
