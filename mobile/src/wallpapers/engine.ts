// Generated from the wallpaper concept page (rounds 1 to 10 of the wallpaper evolution); edit there
// and regenerate rather than by hand. The draw code runs inside the wallpaper's WebView (or iframe
// on web), on a 2D canvas: draw(g, width, height, seconds, {bg, a, b}). Wallpapers 91 to 100 are
// the ones in the app; 81 to 90 are earlier versions that some of them build on.

export const WALLPAPER_DRAW_JS = String.raw`const TAU=Math.PI*2;
const hex=(h)=>{const n=parseInt(h.slice(1),16);return[(n>>16)&255,(n>>8)&255,n&255]};
const rgba=(h,a)=>{const c=hex(h);return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')'};
const mix=(h1,h2,k,a=1)=>{const A=hex(h1),B=hex(h2);return 'rgba('+Math.round(A[0]+(B[0]-A[0])*k)+','+Math.round(A[1]+(B[1]-A[1])*k)+','+Math.round(A[2]+(B[2]-A[2])*k)+','+a+')'};
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const fract=(x)=>x-Math.floor(x);
const hash=(i)=>fract(Math.sin(i*127.1+311.7)*43758.5453);
function glow(g,x,y,r,col,a){const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,rgba(col,a));gr.addColorStop(1,rgba(col,0));g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2)}
function rrect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function beat(t,bpm=70,decay=6){const b=t*bpm/60;const ph=fract(b);return{beat:Math.floor(b),phase:ph,pulse:Math.exp(-ph*decay)}}
let P_=null;
function auroraLights(w,h,t,P){return[[w*(.55+.22*Math.sin(t*.13+.9)),h*(.28+.12*Math.cos(t*.21+1.8)),w*.9,P.a],[w*(.4+.22*Math.sin(t*.17+1.1)),h*(.62+.12*Math.cos(t*.11+2.2)),w*1.1,P.b],[w*(.7+.22*Math.sin(t*.09+.8)),h*(.45+.12*Math.cos(t*.15+1.6)),w*.8,mix(P.a,P.b,.5).replace(/rgba\((\d+),(\d+),(\d+),1\)/,(m,r,g,b)=>'#'+[r,g,b].map(v=>(+v).toString(16).padStart(2,'0')).join(''))]]}
function drawAurora(g,w,h,t,P,a=.5){g.fillStyle=P.bg;g.fillRect(0,0,w,h);for(const[x,y,r,c]of auroraLights(w,h,t,P))glow(g,x,y,r,c,a)}
function auroraAt(x,y,L){let ia=0,ib=0;L.forEach(([lx,ly,r],i)=>{const d=Math.hypot(x-lx,y-ly)/r;const v=Math.max(0,1-d);const vv=v*v;if(i===0)ia+=vv;else if(i===1)ib+=vv;else{ia+=vv/2;ib+=vv/2}});const s=ia+ib;return[Math.min(1,s),s?ib/s:.5]}
function ridgeY(x,w,y0,amp,t,i){const xx=x/w;const env=Math.exp(-Math.pow((xx-.5-.15*Math.sin(t*.2+i))*2.6,2));return y0-amp*env*(.6+.4*Math.sin(xx*18+t*1.3+i*1.7)*Math.sin(xx*7-t*.7+i))}
function iconGrad(g,w,h,a=1,y0=0,y1=h){const gr=g.createLinearGradient(w*.25,y0,w*.75,y1);gr.addColorStop(0,rgba(P_.a,a));gr.addColorStop(1,rgba(P_.b,a));return gr}
function iconWash(g,w,h,P,a=.14){P_=P;g.fillStyle=P.bg;g.fillRect(0,0,w,h);g.fillStyle=iconGrad(g,w,h,a);g.fillRect(0,0,w,h);const v=g.createRadialGradient(w*.5,h*.45,0,w*.5,h*.45,h*.7);v.addColorStop(0,rgba(P.bg,.55));v.addColorStop(1,rgba(P.bg,0));g.fillStyle=v;g.fillRect(0,0,w,h)}
function risers(w,h,t,n,u,seed=0){const out=[];for(let i=0;i<n;i++){const j=i+seed;const sp=.025+.05*hash(j),x0=hash(j+9),life=fract(t*sp+hash(j+3));out.push({x:w*x0+18*u*Math.sin(t*.8+j),y:h*(1.05-life*1.15),a:Math.sin(life*Math.PI)*(.45+.5*hash(j+7)),r:(1+2.2*hash(j+5))*u,i:j})}return out}
function ridgeBand(g,w,h,t,P,top,N,u){const gap=(h-top)/N;const rows=[];for(let i=0;i<N;i++)rows.push({y0:top+i*gap+gap,amp:gap*(1.8+1.4*Math.sin(t*.4+i*.5)),i});return rows}
function ridgeLine(g,w,y0,amp,t,i,u,stroke){g.beginPath();for(let x=0;x<=w;x+=4*u){const y=ridgeY(x,w,y0,amp,t,i);x?g.lineTo(x,y):g.moveTo(x,y)}if(stroke){g.strokeStyle=stroke;g.stroke()}}
function ridgeFill(g,w,h,y0,amp,t,i,u,fill,up){g.beginPath();for(let x=0;x<=w;x+=4*u){const y=ridgeY(x,w,y0,amp,t,i);x?g.lineTo(x,y):g.moveTo(x,y)}if(up){g.lineTo(w+2,-2);g.lineTo(-2,-2)}else{g.lineTo(w+2,h+2);g.lineTo(-2,h+2)}g.closePath();g.fillStyle=fill;g.fill()}
function dotRidgeField(g,w,h,t,P,top,step,u,lightFn){const N=Math.ceil((h-top)/step);for(let i=0;i<N;i++){const y0=top+i*step+step,amp=step*(2+1.6*Math.sin(t*.35+i*.4));for(let x=step/2;x<w;x+=step){const y=ridgeY(x,w,y0,amp,t*.8,i*.6);const lift=clamp((y0-y)/(amp||1),0,1);const v=lightFn?lightFn(x,y):0;g.beginPath();g.arc(x,y,(.6+1.2*lift+1.4*v)*u,0,TAU);g.fillStyle=mix(P.a,P.b,clamp(y/h,0,1),.12+.5*lift+.5*v);g.fill()}}}
function glassRidges(g,w,h,t,P,top,N,u,o={}){const gap=(h-top)/N;for(let i=0;i<N;i++){const y0=top+i*gap+gap,amp=gap*(o.amp||1.8)+gap*1.4*Math.sin(t*.4+i*.5);
 const gr=g.createLinearGradient(0,y0-amp*1.5,0,y0+gap*2);gr.addColorStop(0,mix(P.a,P.b,y0/h,o.glass??.16));gr.addColorStop(1,rgba(P.bg,.95));ridgeFill(g,w,h,y0,amp,t,i,u,gr);g.lineWidth=(o.lw||1.1)*u;
 if(o.light){for(let x=0;x<w;x+=6*u){const y1=ridgeY(x,w,y0,amp,t,i),y2=ridgeY(x+6*u,w,y0,amp,t,i);const v=o.light(x,y1);g.beginPath();g.moveTo(x,y1);g.lineTo(x+6*u,y2);g.strokeStyle=mix(P.a,P.b,y1/h,.25+.75*v);g.stroke()}}
 else ridgeLine(g,w,y0,amp,t,i,u,mix(P.a,P.b,y0/h,o.line??.55))}}
function fireflyLight(ps,R){const R2=R*R;return(x,y)=>{let v=0;for(const p of ps){const dx=x-p.x;if(dx>R||dx<-R)continue;const dy=y-p.y;if(dy>R||dy<-R)continue;const d2=dx*dx+dy*dy;if(d2<R2){const d=Math.sqrt(d2)/R;v+=(1-d)*(1-d)*p.a*1.4}}return Math.min(1,v)}}
function drawFlies(g,ps,h,P,core=1){for(const p of ps){glow(g,p.x,p.y,p.r*8,p.y<h/2?P.a:P.b,p.a*.22);if(core){g.beginPath();g.arc(p.x,p.y,p.r,0,TAU);g.fillStyle=mix('#ffffff',p.y<h/2?P.a:P.b,.4,p.a);g.fill()}}}
function nightSky(g,w,h,t,P,yk=.42,a=.36){iconWash(g,w,h,P,.07);const L=auroraLights(w,h,t*.8,P).map(([x,y,r,c])=>[x,y*yk,r*.9,c]);for(const[x,y,r,c]of L)glow(g,x,y,r,c,a);return L}
function star(g,x,y,r,tw,col,a,u){g.strokeStyle=rgba(col,a*.6);g.lineWidth=.8*u;g.beginPath();g.moveTo(x-r*4*tw,y);g.lineTo(x+r*4*tw,y);g.moveTo(x,y-r*4*tw);g.lineTo(x,y+r*4*tw);g.stroke();g.beginPath();g.arc(x,y,r,0,TAU);g.fillStyle=mix('#ffffff',col,.35,a);g.fill()}
function valley(g,w,h,tt,P,u,light){const N=12;for(let i=0;i<N;i++){const k=i/(N-1);const amp=(30+22*Math.sin(tt*.4+i*.5))*u;
 for(const top of[0,1]){const y0=top?h*(.3-.3*k):h*(.66+.34*k),A=top?-amp:amp,ii=i+(top?9:0);ridgeFill(g,w,h,y0,A,tt,ii,u,rgba(P.bg,.9),!!top);g.lineWidth=1.2*u;const base=top?.4-.4*k:.6+.4*k;
  if(light){for(let x=0;x<w;x+=6*u){const y1=ridgeY(x,w,y0,A,tt,ii),y2=ridgeY(x+6*u,w,y0,A,tt,ii);const v=light(x,y1);g.beginPath();g.moveTo(x,y1);g.lineTo(x+6*u,y2);g.strokeStyle=mix(P.a,P.b,base,.2+.4*(1-k)+.5*v);g.stroke()}}
  else ridgeLine(g,w,y0,A,tt,ii,u,mix(P.a,P.b,base,.25+.5*(1-k)))}}}
function starfield(g,w,h,t,P,L,u,n=130,speed=.45,seed=3,scale=.8){for(const p of risers(w,h,t*speed,n,u,seed)){const[v]=auroraAt(p.x,p.y,L);const tw=Math.pow(.5+.5*Math.sin(t*(2+hash(p.i+12)*4)+p.i*3),3);star(g,p.x,p.y,p.r*scale,tw,p.y<h/2?P.a:P.b,p.a*(.35+.65*v)*(.4+.6*tw),u)}}
function topHill(g,w,h,tt,step,u){const amp0=step*(2+1.6*Math.sin(tt*.35));const pts=[];for(let x=0;x<=w;x+=4*u)pts.push([x,ridgeY(x,w,h*.3+step,amp0,tt*.8,0)]);return pts}
function shoot(g,w,h,t,P,u,period=7,seed=0,y0=.08,y1=.4){const k=Math.floor(t/period+hash(seed)),ph=fract(t/period+hash(seed));const D=.22;if(ph>D)return;const p=ph/D,a=Math.sin(p*Math.PI);
 const sx=w*(.35+.6*hash(k*3+seed)),sy=h*(y0+(y1-y0)*hash(k*5+seed+1)),len=w*.55,dx=-.86,dy=.5;const hx=sx+dx*len*p,hy=sy+dy*len*p,tl=w*.22*a;
 const gr=g.createLinearGradient(hx,hy,hx-dx*tl,hy-dy*tl);gr.addColorStop(0,mix('#ffffff',P.a,.3,.85*a));gr.addColorStop(1,mix(P.a,P.b,.5,0));g.strokeStyle=gr;g.lineWidth=1.6*u;g.lineCap='round';g.beginPath();g.moveTo(hx,hy);g.lineTo(hx-dx*tl,hy-dy*tl);g.stroke();glow(g,hx,hy,9*u,P.a,.5*a)}
function dotHillsSky(g,w,h,t,P,u,top=.3){const tt=t*.75,step=10*u;const pts=topHill(g,w,h,tt,step,u);g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.lineTo(w,h);g.lineTo(0,h);g.closePath();const gr=g.createLinearGradient(0,h*.25,0,h);gr.addColorStop(0,rgba(P.a,.12));gr.addColorStop(.5,rgba(P.b,.05));gr.addColorStop(1,rgba(P.b,0));g.fillStyle=gr;g.fill();return{tt,step,pts}}
function crossing(t,w){const s1=(fract(t*.035)*1.6-.3)*w,s2=(1.3-fract(t*.03+.5)*1.6)*w;return{s1,s2,mx:(s1+s2)/2,meet:Math.exp(-Math.pow((s1-s2)/(w*.25),2))}}
function flyWake(w,h,t,u,n,seed,steps,dt,R){const now=risers(w,h,t,n,u,seed),tr=[];for(let s=0;s<steps;s++)for(const p of risers(w,h,t-s*dt,n,u,seed))tr.push({...p,a:p.a*(1-s/steps)*.8});return{now,lf:fireflyLight(tr,R)}}
function sparkle(x,y,t,k=14){const sp=hash(x*.37+y*.71);return Math.pow(.5+.5*Math.sin(t*(1+2*sp)+sp*40),k)}
function topStars(g,w,h,t,P,u,yMax,n=45,seed=700){g.save();g.beginPath();g.rect(0,0,w,h*yMax);g.clip();for(let i=0;i<n;i++){const x=w*hash(i+seed),y=h*yMax*hash(i+seed+100);const tw=Math.pow(.5+.5*Math.sin(t*(1+hash(i+seed+200)*2.5)+i*3),3);const fade=1-y/(h*yMax);star(g,x,y,(.4+.9*hash(i+seed+300))*u,tw,P.a,(.2+.55*tw)*(.3+.7*fade),u)}g.restore()}
const DRAW={
 81: function(g,w,h,t,P){
 iconWash(g,w,h,P,.07);const tt=t*.5,u=w/390,C=crossing(t,w);const L=[...auroraLights(w,h,tt,P).map(([x,y,r,c])=>[x,y,r*.7,c]),[C.s1,h*.65,w*.6,P.a],[C.s2,h*.85,w*.6,P.b]];
 glow(g,C.s1,h*.65,w*.6,P.a,.12);glow(g,C.s2,h*.85,w*.6,P.b,.12);glow(g,C.mx,h*.72,w*.35,P.a,.14*C.meet);glow(g,C.mx,h*.8,w*.35,P.b,.14*C.meet);
 glassRidges(g,w,h,tt,P,h*.38,22,u,{glass:.07,lw:.95,light:(x,y)=>{const[v]=auroraAt(x,y,L);return Math.min(1,v*v*1.4+.45*C.meet*Math.exp(-Math.pow((x-C.mx)/(w*.2),2)))}})},
 82: function(g,w,h,t,P){
 iconWash(g,w,h,P,.1);const tt=t*.6,u=w/390,L=auroraLights(w,h,tt,P).map(([x,y,r,c])=>[x,h*.48+(y-h*.48)*.35,r*.9,c]);for(const[x,y,r,c]of L)glow(g,x,y,r,c,.28);
 for(let i=0;i<70;i++){const x=w*hash(i+300),y=h*(.24+.52*hash(i+400));const tw=Math.pow(.5+.5*Math.sin(t*(1.2+hash(i+12)*2.5)+i*3),3);star(g,x,y,(.5+1*hash(i+500))*u,tw,y<h/2?P.a:P.b,.25+.6*tw,u)}shoot(g,w,h,t,P,u,6,2,.3,.5);
 const L2=L.map(([x,y,r,c])=>[x,y,r*1.6,c]);valley(g,w,h,tt,P,u,(x,y)=>{const[v]=auroraAt(x,y,L2);return v*v*.8})},
 83: function(g,w,h,t,P){
 iconWash(g,w,h,P,.12);const u=w/390,L=auroraLights(w,h,t*.75,P).map(([x,y,r,c])=>[x,y,r*1.2,c]);for(const[x,y,r,c]of L)glow(g,x,y,r*.8,c,.12);const{tt,step,pts}=dotHillsSky(g,w,h,t,P,u);
 const sx=fract(t*.045)*1.6*w-.3*w,sk=clamp((sx+.3*w)/(1.6*w),0,1);dotRidgeField(g,w,h,tt,P,h*.3,step,u,(x,y)=>{const[v]=auroraAt(x,y,L);const s=Math.exp(-Math.pow((x-sx)/(w*.18),2))*Math.exp(-(y-h*.32)/(h*.25));return Math.min(1,v*v*.9+.9*s+.25*sparkle(x,y,t))});
 for(let i=1;i<pts.length;i++){const[x0,y0]=pts[i-1],[x1,y1]=pts[i];const s=Math.exp(-Math.pow((x1-sx)/(w*.14),2));g.beginPath();g.moveTo(x0,y0-3*u);g.lineTo(x1,y1-3*u);g.strokeStyle=mix(sk<.5?P.a:P.b,'#ffffff',s*.5,.35+.6*s);g.lineWidth=(1.2+1.2*s)*u;g.stroke()}
 glow(g,sx,h*.3,40*u,sk<.5?P.a:P.b,.3)},
 84: function(g,w,h,t,P){
 iconWash(g,w,h,P,.07);const u=w/390,step=11*u;const fly=(tt)=>risers(w,h,tt,22,u,40).map(p=>({...p,x:((p.x+(h-p.y)*.55+30*u*Math.sin(p.y/h*4+p.i))%(w*1.3))-w*.15}));const trail=[];for(let s=0;s<10;s++)for(const p of fly(t*.6-s*.3))trail.push({...p,a:p.a*Math.pow(1-s/10,1.5)});const lf=fireflyLight(trail,46*u);
 for(let y=step/2;y<h;y+=step)for(let x=step/2;x<w;x+=step){let v=lf(x,y)*1.1;const sp=hash(x*.37+y*.71);v*=.7+.3*Math.sin(t*(2+3*sp)+sp*20);v=clamp(v,0,1);g.beginPath();g.arc(x,y,(.5+1.7*v)*u,0,TAU);g.fillStyle=mix(P.a,P.b,clamp(x/w*.6+y/h*.4,0,1),.05+.9*v);g.fill()}
 const fs=fly(t*.6);drawFlies(g,fs,h,P,1);const lead=fs.reduce((a,b)=>b.a>a.a?b:a);glow(g,lead.x,lead.y,26*u,P.a,.35*lead.a)},
 85: function(g,w,h,t,P){
 iconWash(g,w,h,P,.06);const u=w/390;glow(g,w*.5,h*1.05,w*.9,P.b,.18);const F=flyWake(w,h,t*.6,u,16,40,6,.3,44*u);
 dotRidgeField(g,w,h,t*.6,P,h*.3,8*u,u,(x,y)=>clamp(F.lf(x,y)+.4*sparkle(x,y,t),0,1));drawFlies(g,F.now,h,P)},
 86: function(g,w,h,t,P){
 iconWash(g,w,h,P,.1);const tt=t*.7,u=w/390,step=10*u,C=crossing(t,w);const L=[...auroraLights(w,h,tt,P).map(([x,y,r,c])=>[x,y,r*.8,c]),[C.s1,h*.6,w*.5,P.a],[C.s2,h*.85,w*.5,P.b]];
 glow(g,C.s1,h*.6,w*.5,P.a,.1);glow(g,C.s2,h*.85,w*.5,P.b,.1);glow(g,C.mx,h*.72,w*.4,P.a,.14*C.meet);
 dotRidgeField(g,w,h,tt,P,h*.3,step,u,(x,y)=>{const[v]=auroraAt(x,y,L);return Math.min(1,v*v*1.3+.5*C.meet*Math.exp(-Math.pow((x-C.mx)/(w*.18),2)))})},
 87: function(g,w,h,t,P){
 const L=nightSky(g,w,h,t*.8,P,.3,.32),u=w/390;g.save();g.beginPath();g.rect(0,0,w,h*.42);g.clip();starfield(g,w,h,t,P,L,u,100,.25,3,.55);starfield(g,w,h,t,P,L,u,28,.5,200,1);g.restore();shoot(g,w,h,t,P,u,5,4,.04,.18);
 const{tt,step,pts}=dotHillsSky(g,w,h,t,P,u);const sx=fract(t*.045)*1.6*w-.3*w;const L2=L.map(([x,y,r,c])=>[x,h*.55,r,c]);dotRidgeField(g,w,h,tt,P,h*.3,step,u,(x,y)=>{const[v]=auroraAt(x,y,L2);return Math.min(1,v*v*.6+.7*Math.exp(-Math.pow((x-sx)/(w*.16),2))*Math.exp(-(y-h*.32)/(h*.2)))});
 for(let i=1;i<pts.length;i++){const[x0,y0]=pts[i-1],[x1,y1]=pts[i];const s=Math.exp(-Math.pow((x1-sx)/(w*.14),2));g.beginPath();g.moveTo(x0,y0-3*u);g.lineTo(x1,y1-3*u);g.strokeStyle=mix(P.a,'#ffffff',s*.5,.25+.6*s);g.lineWidth=(1+1.2*s)*u;g.stroke()}},
 88: function(g,w,h,t,P){
 iconWash(g,w,h,P,.08);const tt=t*.6,u=w/390,C=crossing(t,w);for(const[x,y,r,c]of auroraLights(w,h,tt,P))glow(g,x,h*.48+(y-h*.48)*.35,r*.85,c,.22);
 for(let i=0;i<70;i++){const x=w*hash(i+300),y=h*(.24+.52*hash(i+400));const tw=Math.pow(.5+.5*Math.sin(t*(1.2+hash(i+12)*2.5)+i*3),3);star(g,x,y,(.5+1*hash(i+500))*u,tw,y<h/2?P.a:P.b,.25+.6*tw,u)}shoot(g,w,h,t,P,u,7,6,.3,.5);
 const L=[[C.s1,h*.15,w*.45,P.a],[C.s2,h*.85,w*.45,P.b]];glow(g,C.s1,h*.15,w*.4,P.a,.1);glow(g,C.s2,h*.85,w*.4,P.b,.1);valley(g,w,h,tt,P,u,(x,y)=>{const[v]=auroraAt(x,y,L);return Math.min(1,v*v*1.4)})},
 89: function(g,w,h,t,P){
 const L=nightSky(g,w,h,t*.8,P,.3,.28),u=w/390;g.save();g.beginPath();g.rect(0,0,w,h*.42);g.clip();starfield(g,w,h,t,P,L,u,80,.25,3,.55);starfield(g,w,h,t,P,L,u,20,.5,200,1);g.restore();shoot(g,w,h,t,P,u,8,4,.04,.18);
 const{tt,step}=dotHillsSky(g,w,h,t,P,u);const F=flyWake(w,h,t*.6,u,14,40,6,.3,44*u);const ps=F.now.filter(p=>p.y>h*.32);dotRidgeField(g,w,h,tt,P,h*.3,step,u,(x,y)=>clamp(F.lf(x,y)+.3*sparkle(x,y,t),0,1));drawFlies(g,ps,h,P)},
 90: function(g,w,h,t,P){
 const L=nightSky(g,w,h,t*.8,P,.3,.28),u=w/390,C=crossing(t,w);g.save();g.beginPath();g.rect(0,0,w,h*.42);g.clip();starfield(g,w,h,t,P,L,u,80,.25,3,.55);starfield(g,w,h,t,P,L,u,20,.5,200,1);g.restore();
 const{tt,step}=dotHillsSky(g,w,h,t,P,u);const L2=[[C.s1,h*.6,w*.5,P.a],[C.s2,h*.85,w*.5,P.b]];glow(g,C.s1,h*.6,w*.45,P.a,.08);glow(g,C.s2,h*.85,w*.45,P.b,.08);
 dotRidgeField(g,w,h,tt,P,h*.3,step,u,(x,y)=>{const[v]=auroraAt(x,y,L2);return Math.min(1,v*v*1.3+.45*C.meet*Math.exp(-Math.pow((x-C.mx)/(w*.18),2)))})},
 91: function(g,w,h,t,P){WP(81)(g,w,h,t,P);topStars(g,w,h,t,P,w/390,.3)},
 92: function(g,w,h,t,P){
 iconWash(g,w,h,P,.1);const tt=t*.6,u=w/390,L=auroraLights(w,h,tt,P).map(([x,y,r,c])=>[x,h*.48+(y-h*.48)*.35,r*.9,c]);for(const[x,y,r,c]of L)glow(g,x,y,r,c,.28);
 for(let i=0;i<80;i++){const sp=.3+hash(i+600);const x=fract(hash(i+300)+t*.006*sp)*w,y=h*(.24+.52*hash(i+400));const tw=Math.pow(.5+.5*Math.sin(t*(1.2+hash(i+12)*2.5)+i*3),3);star(g,x,y,(.4+1*hash(i+500))*u*sp,tw,y<h/2?P.a:P.b,(.2+.6*tw)*Math.min(1,sp),u)}shoot(g,w,h,t,P,u,6,2,.3,.5);
 const L2=L.map(([x,y,r,c])=>[x,y,r*1.6,c]);valley(g,w,h,tt,P,u,(x,y)=>{const[v]=auroraAt(x,y,L2);return v*v*.8})},
 93: function(g,w,h,t,P){WP(83)(g,w,h,t,P);topStars(g,w,h,t,P,w/390,.24,40)},
 94: function(g,w,h,t,P){const u=w/390;WP(84)(g,w,h,t,P);glow(g,w*.5,h*1.05,w*.9,P.b,.16);glow(g,w*.9,h*.05,w*.6,P.a,.08)},
 95: function(g,w,h,t,P){WP(85)(g,w,h,t,P);topStars(g,w,h,t,P,w/390,.24,40)},
 96: function(g,w,h,t,P){
 const L=nightSky(g,w,h,t*.8,P,.3,.32),u=w/390;g.save();g.beginPath();g.rect(0,0,w,h*.42);g.clip();starfield(g,w,h,t,P,L,u,100,.25,3,.55);starfield(g,w,h,t,P,L,u,28,.5,200,1);g.restore();shoot(g,w,h,t,P,u,5,4,.04,.18);
 const{tt,step,pts}=dotHillsSky(g,w,h,t,P,u);const sx=fract(t*.045)*1.6*w-.3*w,sk=clamp((sx+.3*w)/(1.6*w),0,1),col=sk<.5?P.a:P.b;const L2=L.map(([x,y,r,c])=>[x,h*.55,r,c]);
 dotRidgeField(g,w,h,tt,P,h*.3,step,u,(x,y)=>{const[v]=auroraAt(x,y,L2);return Math.min(1,v*v*.6+.7*Math.exp(-Math.pow((x-sx)/(w*.16),2))*Math.exp(-(y-h*.32)/(h*.2)))});
 for(let i=1;i<pts.length;i++){const[x0,y0]=pts[i-1],[x1,y1]=pts[i];const s=Math.exp(-Math.pow((x1-sx)/(w*.14),2));g.beginPath();g.moveTo(x0,y0-3*u);g.lineTo(x1,y1-3*u);g.strokeStyle=mix(col,'#ffffff',s*.5,.25+.6*s);g.lineWidth=(1+1.2*s)*u;g.stroke()}glow(g,sx,h*.3,36*u,col,.25)},
 97: function(g,w,h,t,P){const C=crossing(t,w);WP(88)(g,w,h,t,P);glow(g,C.mx,h*.48,w*.45,P.a,.16*C.meet);glow(g,C.mx,h*.52,w*.3,P.b,.12*C.meet)},
 98: function(g,w,h,t,P){
 const L=nightSky(g,w,h,t*.8,P,.3,.28),u=w/390;g.save();g.beginPath();g.rect(0,0,w,h*.42);g.clip();starfield(g,w,h,t,P,L,u,80,.25,3,.55);starfield(g,w,h,t,P,L,u,20,.5,200,1);g.restore();shoot(g,w,h,t,P,u,8,4,.04,.18);
 const{tt,step}=dotHillsSky(g,w,h,t,P,u);const F=flyWake(w,h,t*.6,u,14,40,6,.3,44*u);dotRidgeField(g,w,h,tt,P,h*.3,step,u,(x,y)=>clamp(F.lf(x,y)+.3*sparkle(x,y,t),0,1));
 drawFlies(g,F.now.map(p=>({...p,a:p.a*clamp((p.y-h*.12)/(h*.2),0,1)})).filter(p=>p.a>.01),h,P)},
 99: function(g,w,h,t,P){const C=crossing(t,w),u=w/390;WP(90)(g,w,h,t,P);glow(g,C.mx,h*.72,w*.4,P.a,.14*C.meet);shoot(g,w,h,t,P,u,7,8,.04,.2)},
 100: function(g,w,h,t,P){
 iconWash(g,w,h,P,.1);const tt=t*.6,u=w/390,L=auroraLights(w,h,tt,P).map(([x,y,r,c])=>[x,h*.48+(y-h*.48)*.35,r*.9,c]);for(const[x,y,r,c]of L)glow(g,x,y,r,c,.24);
 for(let i=0;i<60;i++){const x=w*hash(i+300),y=h*(.24+.52*hash(i+400));const tw=Math.pow(.5+.5*Math.sin(t*(1.2+hash(i+12)*2.5)+i*3),3);star(g,x,y,(.4+.9*hash(i+500))*u,tw,y<h/2?P.a:P.b,.2+.5*tw,u)}
 const ps=risers(w,h,t*.7,26,u,21).map(p=>({...p,y:h*.26+(p.y/h)*h*.48}));const lf=fireflyLight(ps,60*u),L2=L.map(([x,y,r,c])=>[x,y,r*1.6,c]);valley(g,w,h,tt,P,u,(x,y)=>{const[v]=auroraAt(x,y,L2);return Math.min(1,v*v*.6+lf(x,y))});drawFlies(g,ps,h,P)},
};
function WP(n){return DRAW[n]}`;
