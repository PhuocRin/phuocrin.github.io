(function(root){
  function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
  function hexA(h,a){var n=parseInt(h.slice(1),16);return "rgba("+(n>>16&255)+","+(n>>8&255)+","+(n&255)+","+a+")";}

  var PAL = [
    {name:"Bạc hà",    mood:"light", g:["#e2eeee","#bfd5d7","#6f8f96"], sheet:"#f2f8f8", edge:"#ffffff", tint:"#8fd6ff", shade:"#3c6670"},
    {name:"Champagne", mood:"light", g:["#f4ebdf","#dccab3","#9a826c"], sheet:"#fcf6ee", edge:"#ffffff", tint:"#ffc98a", shade:"#6e5238"},
    {name:"Oải hương", mood:"light", g:["#ebe8f6","#cbc4e6","#7f78aa"], sheet:"#f7f5fd", edge:"#ffffff", tint:"#b9a6ff", shade:"#4b4380"},
    {name:"Hồng đào",  mood:"light", g:["#f8e6e2","#e8c0b9","#a87872"], sheet:"#fef4f1", edge:"#ffffff", tint:"#ffb3c0", shade:"#7a4747"},
    {name:"Than chì",  mood:"dark",  g:["#4a515c","#262b33","#0d0f12"], sheet:"#6b7482", edge:"#eef3fa", tint:"#7fb2ff", shade:"#000000"},
    {name:"Đêm biển",  mood:"dark",  g:["#2a4a70","#132a47","#050d1a"], sheet:"#4b6f99", edge:"#e8f4ff", tint:"#5fd0ff", shade:"#00040c"}
  ];
  var COMPS = ["Lớp sóng","Vòm kính","Ruy băng"];

  // geometry helpers in "W units": x in [0,1], y in [0, H/W]
  function cubic(p0,p1,p2,p3){return {p0:p0,p1:p1,p2:p2,p3:p3};}
  function addCubic(ctx,c,W,move){ if(move) ctx.moveTo(c.p0[0]*W,c.p0[1]*W); ctx.bezierCurveTo(c.p1[0]*W,c.p1[1]*W,c.p2[0]*W,c.p2[1]*W,c.p3[0]*W,c.p3[1]*W); }
  function revCubic(c){return cubic(c.p3,c.p2,c.p1,c.p0);}

  function background(ctx,W,H,P,r){
    var g = ctx.createLinearGradient(0,0,W*0.45,H);
    g.addColorStop(0,P.g[0]); g.addColorStop(0.55,P.g[1]); g.addColorStop(1,P.g[2]);
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    var lx=W*(0.2+r()*0.4), ly=H*(0.12+r()*0.15);
    var rg=ctx.createRadialGradient(lx,ly,0,lx,ly,W*1.1);
    rg.addColorStop(0,hexA(P.sheet,P.mood==="dark"?0.22:0.55)); rg.addColorStop(1,hexA(P.sheet,0));
    ctx.fillStyle=rg; ctx.fillRect(0,0,W,H);
  }

  // edge: array of cubics (continuous). draw luminous edge with faded ends
  function edgePath(ctx,edge,W){ctx.beginPath(); for(var i=0;i<edge.length;i++) addCubic(ctx,edge[i],W,i===0);}
  function strokeEdge(ctx,edge,W,P,strength,inward){
    var a=edge[0].p0, b=edge[edge.length-1].p3, dark=P.mood==="dark";
    function fade(col,alpha){
      var g=ctx.createLinearGradient(a[0]*W,a[1]*W,b[0]*W,b[1]*W);
      g.addColorStop(0,hexA(col,0)); g.addColorStop(0.18,hexA(col,alpha*0.7)); g.addColorStop(0.5,hexA(col,alpha)); g.addColorStop(0.82,hexA(col,alpha*0.7)); g.addColorStop(1,hexA(col,0));
      return g;
    }
    ctx.save(); ctx.lineCap="round"; ctx.lineJoin="round";
    // dark refraction band just inside the edge
    ctx.save(); ctx.translate(inward[0]*W*0.006, inward[1]*W*0.006);
    edgePath(ctx,edge,W); ctx.lineWidth=W*0.007; ctx.strokeStyle=fade(P.shade,(dark?0.5:0.16)*strength); ctx.stroke(); ctx.restore();
    // chromatic tint line
    ctx.save(); ctx.translate(inward[0]*W*0.0025, inward[1]*W*0.0025);
    edgePath(ctx,edge,W); ctx.lineWidth=W*0.0035; ctx.strokeStyle=fade(P.tint,0.75*strength); ctx.stroke(); ctx.restore();
    // bright core
    edgePath(ctx,edge,W); ctx.lineWidth=W*0.0019; ctx.strokeStyle=fade(P.edge,0.98*strength); ctx.stroke();
    ctx.restore();
  }

  // region: function adding path commands (no beginPath). edge: cubics. o: {inward:[x,y], grad:[x0,y0,x1,y1] in W units, shadow:[dx,dy]}
  function sheet(ctx,W,H,P,region,edge,o){
    var dark=P.mood==="dark", g;
    // cast shadow, only outside the sheet
    ctx.save();
    ctx.beginPath(); ctx.rect(-W,-H,W*3,H*3); region(ctx); ctx.clip("evenodd");
    var OFF=W*8;
    ctx.translate(-OFF,0);
    ctx.beginPath(); region(ctx);
    ctx.shadowColor=hexA(P.shade,dark?0.7:0.32); ctx.shadowBlur=W*0.07; ctx.shadowOffsetX=OFF+o.shadow[0]*W; ctx.shadowOffsetY=o.shadow[1]*W;
    ctx.fillStyle="#000"; ctx.fill();
    ctx.restore();
    // body
    ctx.save(); ctx.beginPath(); region(ctx); ctx.clip();
    g=ctx.createLinearGradient(o.grad[0]*W,o.grad[1]*W,o.grad[2]*W,o.grad[3]*W);
    g.addColorStop(0,hexA(P.sheet,dark?0.32:0.72)); g.addColorStop(0.45,hexA(P.sheet,dark?0.12:0.28)); g.addColorStop(1,hexA(P.sheet,dark?0.04:0.08));
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    // soft inner glow hugging the edge
    var widths=[0.16,0.09,0.045,0.02], alphas=dark?[0.03,0.04,0.05,0.07]:[0.05,0.07,0.09,0.12];
    for(var i=0;i<widths.length;i++){ edgePath(ctx,edge,W); ctx.lineWidth=W*widths[i]; ctx.strokeStyle=hexA(P.edge,alphas[i]); ctx.stroke(); }
    ctx.restore();
    strokeEdge(ctx,edge,W,P,1,o.inward);
  }

  function wire(ctx,W,P,edge,strength){ strokeEdge(ctx,edge,W,P,strength,[0,0]); }

  function arcCubics(cx,cy,rx,ry,a0,a1){ // approximate elliptical arc with cubics (angles in rad)
    var out=[], n=Math.ceil(Math.abs(a1-a0)/(Math.PI/2)), step=(a1-a0)/n, k=4/3*Math.tan(step/4);
    for(var i=0;i<n;i++){
      var t0=a0+i*step, t1=t0+step;
      var p0=[cx+rx*Math.cos(t0),cy+ry*Math.sin(t0)], p3=[cx+rx*Math.cos(t1),cy+ry*Math.sin(t1)];
      var p1=[p0[0]-k*rx*Math.sin(t0),p0[1]+k*ry*Math.cos(t0)], p2=[p3[0]+k*rx*Math.sin(t1),p3[1]-k*ry*Math.cos(t1)];
      out.push(cubic(p0,p1,p2,p3));
    }
    return out;
  }

  function compose(ctx,W,H,P,comp,r){
    var Hu=H/W; function j(a,b){return a+r()*(b-a);}
    var side=r()<0.5?-1:1;
    var land = W>H, S = land ? 0.6 : 1; // landscape (desktop): smaller round shapes, kept left of centre for icons/Dock
    if(comp===0){ // Lớp sóng: stacked S-edged sheets
      var arcFirst=r()<0.5;
      var cx=j(0.45,0.75), cy=Hu*j(0.5,0.56), rr=j(0.36,0.46)*S; if (land) cx=j(0.3,0.45);
      var ring=arcCubics(cx,cy,rr,rr*j(0.95,1.1),side>0?Math.PI*1.05:-Math.PI*0.05,side>0?Math.PI*1.95:Math.PI*0.85);
      if(arcFirst) wire(ctx,W,P,ring,0.8);
      for(var i=0;i<2;i++){
        var y0=Hu*(i===0?j(0.5,0.56):j(0.74,0.8)), a=Hu*j(0.13,0.18), tilt=Hu*j(0.08,0.14), s=(i%2?-1:1)*side;
        var e=[cubic([-0.2,y0+s*tilt],[j(0.25,0.4),y0-a],[j(0.6,0.8),y0+a*0.9],[1.2,y0-s*tilt])];
        var region=(function(e){return function(c){addCubic(c,e[0],W,true); c.lineTo(1.2*W,(Hu+0.3)*W); c.lineTo(-0.2*W,(Hu+0.3)*W); c.closePath();};})(e);
        sheet(ctx,W,H,P,region,e,{inward:[0,1],grad:[0.5,y0-a,0.5,y0+0.9],shadow:[0,-0.016]});
      }
      if(!arcFirst) wire(ctx,W,P,ring,0.55);
    } else if(comp===1){ // Vòm kính: a curved floor sheet + a large lens disc + a thin halo
      var fy=Hu*j(0.7,0.76), fa=j(0.06,0.12);
      var fe=[cubic([-0.2,fy+side*0.12],[0.25,fy-fa],[0.7,fy-fa*0.5],[1.2,fy-side*0.12])];
      sheet(ctx,W,H,P,function(c){addCubic(c,fe[0],W,true); c.lineTo(1.2*W,(Hu+0.3)*W); c.lineTo(-0.2*W,(Hu+0.3)*W); c.closePath();},fe,{inward:[0,1],grad:[0.5,fy-0.05,0.5,fy+0.6],shadow:[0,-0.012]});
      var lx=land?j(0.3,0.42):0.5+side*j(0.08,0.2), ly=Hu*j(0.56,0.62), lr=j(0.36,0.44)*S;
      var disc=arcCubics(lx,ly,lr,lr,-Math.PI,Math.PI);
      sheet(ctx,W,H,P,function(c){addCubic(c,disc[0],W,true); for(var k=1;k<disc.length;k++) addCubic(c,disc[k],W,false); c.closePath();},
        arcCubics(lx,ly,lr,lr,-Math.PI*0.95,-Math.PI*0.05),{inward:[0,1],grad:[lx-lr,ly-lr,lx+lr,ly+lr],shadow:[side*0.01,0.03]});
      var lower=arcCubics(lx,ly,lr,lr,Math.PI*0.08,Math.PI*0.92);
      wire(ctx,W,P,lower,0.45);
      var hr=lr*j(1.15,1.28);
      wire(ctx,W,P,arcCubics(lx-side*0.03,ly+0.02,hr,hr,side>0?Math.PI*0.75:-Math.PI*0.6,side>0?Math.PI*1.6:Math.PI*0.25),0.6);
    } else { // Ruy băng: two glass ribbons sweeping diagonally
      for(var q=0;q<2;q++){
        var main=q===1, w=(main?j(0.28,0.36):j(0.14,0.2))*(land?0.75:1), off=(main?0:j(-0.35,-0.2))*(land?0.55:1);
        var y0b=Hu*j(0.86,0.95)+off, y3=Hu*j(0.4,0.48)+off;
        var c1=[j(0.15,0.3),Hu*j(0.45,0.55)+off], c2=[j(0.6,0.8),Hu*j(0.8,0.9)+off];
        if(side<0){var t=y0b; y0b=y3; y3=t; c1=[c1[0],c2[1]]; c2=[c2[0],Hu*j(0.45,0.55)+off];}
        var top=cubic([-0.2,y0b-w/2],[c1[0],c1[1]-w/2],[c2[0],c2[1]-w/2],[1.2,y3-w/2]);
        var bot=cubic([-0.2,y0b+w/2],[c1[0],c1[1]+w/2],[c2[0],c2[1]+w/2],[1.2,y3+w/2]);
        var reg=(function(top,bot){return function(c){addCubic(c,top,W,true); c.lineTo(bot.p3[0]*W,bot.p3[1]*W); addCubic(c,revCubic(bot),W,false); c.closePath();};})(top,bot);
        sheet(ctx,W,H,P,reg,[top],{inward:[0,1],grad:[0.5,(y0b+y3)/2-w,0.5,(y0b+y3)/2+w],shadow:[0,0.022]});
        strokeEdge(ctx,[bot],W,P,0.6,[0,-1]);
      }
    }
  }

  var NOISE=null;
  function grain(ctx,W,H,dark,mk){
    if(!NOISE){NOISE=mk(128,128); var x=NOISE.getContext("2d"), d=x.createImageData(128,128), r=mulberry32(7);
      for(var i=0;i<d.data.length;i+=4){var v=r()*255|0; d.data[i]=d.data[i+1]=d.data[i+2]=v; d.data[i+3]=255;} x.putImageData(d,0,0);}
    ctx.save(); ctx.globalAlpha=dark?0.045:0.03; ctx.globalCompositeOperation="overlay";
    ctx.fillStyle=ctx.createPattern(NOISE,"repeat"); ctx.fillRect(0,0,W,H); ctx.restore();
  }

  function render(cv,sp,mk){
    var W=cv.width,H=cv.height,ctx=cv.getContext("2d"),P=PAL[sp.p],r=mulberry32(sp.seed);
    ctx.setTransform(1,0,0,1,0,0); ctx.globalAlpha=1; ctx.globalCompositeOperation="source-over";
    background(ctx,W,H,P,r);
    compose(ctx,W,H,P,sp.comp,r);
    grain(ctx,W,H,P.mood==="dark",mk);
  }

  root.KinhLua={PAL:PAL,COMPS:COMPS,render:render,mulberry32:mulberry32};
})(typeof module!=="undefined"?module.exports:window);
