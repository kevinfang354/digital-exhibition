import * as T from './three.module.js';
const C={shell:0x61b8ce,steel:0xced8db,flap:0xd3ac64,black:0x27343c,muscle:0xa5d4dc,body:0x738a98,blue:0x238eaa};
function mat(c,opacity=1){return new T.MeshStandardMaterial({color:c,roughness:.44,metalness:.18,transparent:opacity<1,opacity,side:T.DoubleSide})}
function mesh(g,c,name,p=[0,0,0],opacity=1){let m=new T.Mesh(g,mat(c,opacity));m.name=name;m.position.set(...p);return m}
function box(w,h,d,c,name,p){return mesh(new T.BoxGeometry(w,h,d),c,name,p)}
function cyl(r,h,c,name,p,opacity=1){return mesh(new T.CylinderGeometry(r,r,h,20),c,name,p,opacity)}
function line(points,r,c,name){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),Math.max(points.length*2,16),r,6,false),c,name)}
function segment(a,b,r,c,name){const av=new T.Vector3(...a),bv=new T.Vector3(...b);let m=cyl(r,av.distanceTo(bv),c,name);m.position.copy(av).add(bv).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());return m}
function cap(g,y){g.add(cyl(.24,.12,C.steel,'端盖',[0,y,0]));for(let i=0;i<3;i++){let a=i*Math.PI*2/3;g.add(cyl(.026,.15,C.black,'紧固螺栓',[.17*Math.cos(a),y+.01,.17*Math.sin(a)]))}}
export function vsca({explode=0,pressure=0,vacuum=0,transparent=false}={}){
 const g=new T.Group();g.name='VSCA 结构示意';const h=2.8*(1-pressure*.18);const core=new T.Group();core.name='三根气动人工肌肉 PAM';
 for(let j=0;j<3;j++){let a=j*Math.PI*2/3,x=.105*Math.cos(a),z=.105*Math.sin(a);core.add(cyl(.065*(1+pressure*.22),h,C.muscle,'PAM '+(j+1),[x,0,z]));for(let dir of [-1,1]){let pts=[];for(let k=0;k<=72;k++){let t=k/72,q=dir*t*Math.PI*10;pts.push([x+(.069*(1+pressure*.22))*Math.cos(q),h*(t-.5),z+(.069*(1+pressure*.22))*Math.sin(q)])}core.add(line(pts,.006,C.black,'PAM 编织网'))}}
 g.add(core);let coat=cyl(.205,h,C.shell,'硅胶基体',[explode*.7,0,0],transparent?.17:.8);g.add(coat);
 let flaps=new T.Group();flaps.name='PET 重叠襟翼';flaps.position.x=explode*1.45;
 for(let row=0;row<10;row++)for(let j=0;j<12;j++){let a=j*Math.PI/6+row*.12;let f=box(.10,h/9,.025,vacuum>.5?0xb98733:C.flap,'PET 襟翼',[.219*Math.sin(a),h*(row/10-.45),.219*Math.cos(a)]);f.rotation.y=a;flaps.add(f)}g.add(flaps);
 let shell=cyl(.242,h,C.blue,'密封外膜',[explode*2.2,0,0],transparent?.13:(explode>.05?.42:.62));g.add(shell);cap(g,-h/2-.06-explode*.25);cap(g,h/2+.06+explode*.25);
 g.add(line([[0,h/2+.12,0],[0,h/2+.4,.0],[.4,h/2+.45,0]],.021,C.blue,'正压气路'));g.add(line([[.15,-h/2,0],[.45,-h/2-.2,0],[.55,-h/2+.3,0]],.016,C.flap,'真空气路'));
 return g;
}
function band(g,y,rx,rz,name,color=C.black){let pts=[];for(let i=0;i<=48;i++){let a=i/48*Math.PI*2;pts.push([rx*Math.cos(a),y,rz*Math.sin(a)])}const b=line(pts,.115,color,name);g.add(b)}
export function exoskeleton({bend=0,side=0,explode=0,transparent=false,pressure=0,vacuum=0}={}){
 const root=new T.Group();root.name='PVSAE 腰椎助力外骨骼 · 比例示意';
 const pelvis=new T.Group();root.add(pelvis);band(pelvis,-1,.7,.40,'骨盆承重腰带');pelvis.add(box(1.15,.38,.16,C.black,'下部连接板',[0,-1,-.53]));
 const torso=new T.Group();torso.position.y=-.8;torso.rotation.x=bend;torso.rotation.z=side;root.add(torso);
 const body=mesh(new T.CylinderGeometry(.65,.52,2.2,20),C.body,'人体躯干示意',[0,1,0],transparent?.10:.17);torso.add(body);
 let head=mesh(new T.SphereGeometry(.31,16,12),C.body,'头部示意',[0,2.75,0],.3);torso.add(head);torso.add(cyl(.15,.34,C.body,'颈部示意',[0,2.35,0],.3));
 torso.add(box(1.15,.40,.16,C.black,'背部连接板',[0,1.95,-.55-explode*.25]));band(torso,1.7,.66,.39,'胸带');
 for(let sign of [-1,1]){torso.add(line([[sign*.43,1.85,-.55],[sign*.55,2.3,-.3],[sign*.55,2.32,.25],[sign*.48,1.2,.48]],.075,C.black,'肩带'));root.add(segment([sign*.35,-1.25,0],[sign*.42,-2.5,.06],.21,C.body,'腿部示意'));}
 torso.updateMatrixWorld(true);root.updateMatrixWorld(true);
 for(let sign of [-1,1]){const a=new T.Vector3(sign*.35,-.93,-.65),b=torso.localToWorld(new T.Vector3(sign*.35,1.9,-.68));a.x+=sign*explode*.6;b.x+=sign*explode*.6;
 const d=b.clone().sub(a),len=d.length();const v=vsca({pressure:0,vacuum,transparent});v.scale.set(.7,len/3.07,.7);v.position.copy(a).add(b).multiplyScalar(.5);v.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());v.name=sign<0?'左侧 VSCA':'右侧 VSCA';root.add(v);
 for(let p of [a,b]){let flange=cyl(.20,.10,C.steel,'法兰连接件');flange.rotation.x=Math.PI/2;flange.position.copy(p);root.add(flange)}
 }
 return root;
}
export function odha({pressure=0,explode=0,transparent=false,vacuum=0}={}){
 let g=new T.Group();g.name='ODHA 全方位螺旋软体驱动器 · 示意';let pts=[];const total=pressure*Math.PI*2.1;
 for(let i=0;i<=64;i++){let t=i/64,a=t*total;pts.push(new T.Vector3((Math.cos(a)-1)*.65,1.55-2.5*t*(1-.38*pressure),Math.sin(a)*.65))}
 const curve=new T.CatmullRomCurve3(pts);g.add(mesh(new T.TubeGeometry(curve,64,.20,16,false),C.shell,'三腔硅胶基体',undefined,transparent?.24:1));
 const frames=curve.computeFrenetFrames(64,false);
 for(let j=0;j<3;j++){let cs=[];let a=j*2*Math.PI/3;for(let i=0;i<=64;i++)cs.push(pts[i].clone().addScaledVector(frames.normals[i],.105*Math.cos(a)).addScaledVector(frames.binormals[i],.105*Math.sin(a)));g.add(mesh(new T.TubeGeometry(new T.CatmullRomCurve3(cs),64,.041,8,false),[0x2471ab,0xd5a743,0x567a80][j],'独立气腔 '+(j+1)))}
 let fs=[];for(let k=0;k<=192;k++){let t=k/192,i=Math.min(64,Math.round(t*64)),a=t*Math.PI*16;fs.push(curve.getPoint(t).addScaledVector(frames.normals[i],.22*Math.cos(a)).addScaledVector(frames.binormals[i],.22*Math.sin(a)))}g.add(mesh(new T.TubeGeometry(new T.CatmullRomCurve3(fs),192,.012,6,false),C.flap,'Kevlar 螺旋纤维'));
 if(explode>0){let s=cyl(.27,2.8,C.blue,'层阻塞外套',[1.4*explode,0,0],.35);g.add(s)}
 cap(g,1.64);return g;
}
export function dispose(root){root.traverse(o=>{if(o.isMesh){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose()}})}
export const creators={exo:exoskeleton,vsca,odha};
