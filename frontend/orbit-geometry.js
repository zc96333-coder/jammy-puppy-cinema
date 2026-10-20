/* Shared forward/inverse projection: rail, dates, nodes and drop targets agree. */
(function(root){
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function project(day,{center,scale,width,height}){
  const radius=width*.96,u=(day-center)*scale,q=u/radius,depth=1-1/Math.sqrt(1+q*q);
  return {x:width/2+radius*Math.atan(q),y:height*.69-depth*Math.min(250,height*.72),size:1-depth*.48};
 }
 function unproject(x,{center,scale,width}){const radius=width*.96;return center+radius*Math.tan((x-width/2)/radius)/scale;}
 function bounds(view){return [Math.floor(unproject(-70,view)),Math.ceil(unproject(view.width+70,view))];}
 function grabCenter(day,x,view){return day-(unproject(x,{...view,center:0}));}
 root.OrbitGeometry={project,unproject,bounds,grabCenter,clamp};
 if(typeof module!=='undefined')module.exports=root.OrbitGeometry;
})(typeof globalThis!=='undefined'?globalThis:this);
