/* Editable exhibit reconstruction. Units: mm; NOT a SolidWorks conversion.
 * Geometry dimensions except documented anchors are interpretive. */
(function(scope){
const defaults={bodyLength:200,wheelDiameter:28,radialWheelCenter:69,frontX:-85,rearX:85,midX:-8,frontWheelAngle:10};
function createRobot(T,input={}){
 const p={...defaults,...input}, root=new T.Group();root.name='PipelineRobot_Exhibit_V6';root.userData={units:'mm',type:'editable exhibit reconstruction derived from V2',notCADConversion:true,parameters:p,steeringJoint:'front assembly pivots about Y at x=-35; display trajectory is estimated',preload:'69mm free wheel-center radius compressed against nominal 80mm pipe radius; model estimate'};
 const mats={shell:new T.MeshStandardMaterial({color:0xe8ece8,roughness:.5,metalness:.08,side:T.DoubleSide}),steel:new T.MeshStandardMaterial({color:0x90999d,roughness:.32,metalness:.8}),dark:new T.MeshStandardMaterial({color:0x222b31,roughness:.55,metalness:.4}),tire:new T.MeshStandardMaterial({color:0x8b905a,roughness:.88}),hub:new T.MeshStandardMaterial({color:0xe4e5d9,roughness:.4}),drive:new T.MeshStandardMaterial({color:0x167f8b,roughness:.35,metalness:.5}),gear:new T.MeshStandardMaterial({color:0xc5a46e,roughness:.4,metalness:.65})};
 const groups={},parts=[],arms=[],wheels=[],wheelRollers=[];
 function group(name,parent=root){const g=new T.Group();g.name=name;parent.add(g);return g;}
 const front=group('前旋转单元'), mid=group('中间传动单元'),rear=group('后驱动单元');groups.front=front;groups.mid=mid;groups.rear=rear;
 front.position.x=-35;rear.position.x=45;
 front.userData.joint='绕中间转向轴的展示用单轴铰接；转向角与安装净距待实物尺寸核实。';
 const rotor=group('前端螺旋旋转组件',front);rotor.position.x=p.frontX+35;
 function add(geo,mat,name,parent,pos,layer=1,displayNote='结构展示用几何，局部尺寸或形状已简化。'){
  const m=new T.Mesh(geo,mats[mat]);m.name=name;m.position.set(...pos);m.userData={layer,displayNote,geometryStatus:'simplified / estimated',system:parent.name};m.castShadow=true;m.receiveShadow=true;parent.add(m);parts.push(m);return m;
 }
 function cylinder(parent,name,r,len,pos,axis,mat='steel',layer=1){const m=add(new T.CylinderGeometry(r,r,len,32),mat,name,parent,pos,layer);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(...axis).normalize());return m;}
 function rod(parent,name,a,b,r=2,mat='steel',layer=1){let v=new T.Vector3(...b).sub(new T.Vector3(...a)),c=new T.Vector3(...a).addScaledVector(v,.5);return cylinder(parent,name,r,v.length(),c.toArray(),v.toArray(),mat,layer);}
 function box(parent,name,size,pos,mat='steel',layer=1){return add(new T.BoxGeometry(...size),mat,name,parent,pos,layer);}
 function gear(parent,name,r,pos,axis){const g=group(name,parent);g.position.set(...pos);g.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(...axis).normalize());cylinder(g,name+'轮体',r,5,[0,0,0],[0,1,0],'gear',2);for(let i=0;i<24;i++){let a=i*Math.PI/12;const m=box(g,name+'齿'+i,[3,5,4],[(r+1)*Math.cos(a),0,(r+1)*Math.sin(a)],'gear',2);m.rotation.y=-a;}return g;}
 // Core: two yokes, shafts and mounting discs.
 cylinder(rotor,'前旋转盘',17,9,[0,0,0],[1,0,0],'hub');
 rod(front,'前传动轴',[-50,0,0],[0,0,0],4);
 for(const y of [-16,16])box(mid,'转向连架杆',[49,4,8],[-29,y,0]);
 box(mid,'转向轴支座',[6,36,15],[-5,0,0]);
 rod(mid,'中间转向轴',[-33,-20,0],[-33,20,0],4);
 cylinder(mid,'中间支承座',28,8,[12,0,0],[1,0,0],'hub');
 cylinder(rear,'电机支承板',27,6,[0,0,0],[1,0,0],'hub');
 cylinder(rear,'后端盖',32,5,[49,0,0],[1,0,0],'shell');
 rod(mid,'主传动轴',[-28,0,0],[55,0,0],4,'steel',2);
 gear(mid,'中间锥齿轮示意',12,[-32,0,0],[0,1,0]);
 gear(mid,'驱动锥齿轮示意',12,[-18,0,0],[1,0,0]);
 gear(mid,'转向直齿轮示意',17,[20,0,0],[1,0,0]);
 gear(mid,'减速小齿轮示意',9,[20,-23,0],[1,0,0]);
 for(const z of [-12,12]){cylinder(rear,z<0?'螺旋驱动电机包络':'转向电机包络',10,32,[22,0,z],[1,0,0],'drive',2);cylinder(rear,'电机端部',10.5,5,[40,0,z],[1,0,0],'dark',2);rod(rear,'联轴器轴',[3,0,z],[-12,0,z],3,'steel',2);}
 function arm(parent,name,x,angle,isFront){
  const a=group(name,parent);a.position.x=x;a.rotation.x=angle;
  const baseY=isFront?16:32;
  cylinder(a,'伸缩臂套筒',5.3,20,[0,baseY+9,0],[0,1,0],'hub',3);
  const elasticRod=rod(a,'弹性伸缩杆',[0,baseY,0],[0,p.radialWheelCenter,0],2.5,'steel',3);
  const coil=[];for(let i=0;i<=144;i++){let u=i/144,ang=u*Math.PI*14;coil.push(new T.Vector3(6.8*Math.cos(ang),baseY+5+u*(p.radialWheelCenter-baseY-14),6.8*Math.sin(ang)));}
  const springMesh=add(new T.TubeGeometry(new T.CatmullRomCurve3(coil),144,.85,6,false),'steel','压缩螺旋弹簧',a,[0,0,0],3);
  const carrier=group('轮座',a);carrier.position.y=p.radialWheelCenter;
  box(carrier,'轮轴支架',[13,6,12],[0,-3,0],'hub',3);
  const axis=isFront?new T.Vector3(Math.cos(p.frontWheelAngle*Math.PI/180),0,Math.sin(p.frontWheelAngle*Math.PI/180)):new T.Vector3(0,0,1);
  cylinder(carrier,'轮轴',2.8,29,[0,0,0],axis.toArray(),'steel',3);
  for(const side of [-1,1]){
   const wp=group('被动滚轮',carrier);wp.position.copy(axis.clone().multiplyScalar(10*side));wp.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),axis);
   const rolling=group('轮胎与轮毂转动体',wp);
   cylinder(rolling,'弹性轮胎',p.wheelDiameter/2,6,[0,0,0],[0,1,0],'tire',3);
   cylinder(rolling,'轮毂',9,6.4,[0,0,0],[0,1,0],'hub',3);
   cylinder(rolling,'轴承',5,6.8,[0,0,0],[0,1,0],'dark',3);
   for(const face of [-1,1])box(rolling,'轮毂滚动标记',[4,.8,2],[8,face*3.5,0],'drive',3);
   cylinder(wp,'轮轴',2.4,7,[0,0,0],[0,1,0],'steel',3);
   wheels.push(wp);wheelRollers.push({group:rolling,kind:isFront?'front':parent===rear?'rear':'mid'});
  }
  arms.push({group:a,elasticRod,springMesh,carrier,baseY,centerY:p.radialWheelCenter,isFront});
 }
 for(let i=0;i<3;i++){arm(rotor,'前臂'+(i+1),0,i*Math.PI*2/3+.3,true);arm(rear,'后臂'+(i+1),p.rearX-45,i*Math.PI*2/3+.3,false);}
 for(let i=0;i<2;i++)arm(mid,'中间臂'+(i+1),p.midX,i*Math.PI,false);
 // Deliberately open forward shell, matching the sample's exposed transmission window.
 // The front U opening faces +Z (towards the illustrated branch) and travels with the steered unit.
 const cover=add(new T.CylinderGeometry(33,33,52,64,1,true,Math.PI*.32,Math.PI*1.36),'shell','前端U形转向开口',front,[-25,0,0],4,'展示开口随前单元偏转；尺寸与限位角为比例重建。');cover.rotation.z=Math.PI/2;
 cylinder(rear,'后驱动单元外壳',33,47,[25,0,0],[1,0,0],'shell',4);
 for(const x of [-43,38,91])for(let i=0;i<3;i++){let a=i*2*Math.PI/3;const par=x>44?rear:mid;box(par,'外壳紧固件',[3,3,3],[x-(par===rear?45:0),32*Math.cos(a),32*Math.sin(a)],'dark',4);}
 const cable=group('外接电源线示意',rear);for(let i=0;i<2;i++){const pts=[new T.Vector3(52,0,i*4-2),new T.Vector3(67,-8,i*4-2),new T.Vector3(85,-30,i*5-2)];add(new T.TubeGeometry(new T.CatmullRomCurve3(pts),20,1.2,6,false),'dark','12V外接线缆示意',cable,[0,0,0],4,'线缆路径为示意。');}
 function setArmCompression(arm,amount){
   const span=arm.centerY-arm.baseY,travel=arm.isFront?.35:.55,scale=1-amount*travel;
   arm.elasticRod.scale.y=scale;arm.elasticRod.position.y=arm.baseY+span*scale/2;
   arm.springMesh.scale.y=scale;arm.springMesh.position.y=(arm.baseY+5)*(1-scale);
   arm.carrier.position.y=arm.centerY-amount*span*travel;
   arm.currentCompression=amount;
 }
 const tireSamples=[];
 for(let j=0;j<32;j++)for(const y of [-3,3])tireSamples.push(new T.Vector3((p.wheelDiameter/2)*Math.cos(j*Math.PI/16),y,(p.wheelDiameter/2)*Math.sin(j*Math.PI/16)));
 function fitToTee(){
  // Conservative sampled tire-envelope check in the union of Ø160 main and branch tubes.
  // The cylinder samples are for exhibit geometry and do not represent load/contact mechanics.
  const point=new T.Vector3();let unresolved=0,maxCompression=0,frontEngaged=0,rearEngaged=0;
  for(const arm of arms){
   const fits=amount=>{
    setArmCompression(arm,amount);root.updateMatrixWorld(true);
    for(const tire of wheels.filter(w=>w.parent===arm.carrier)){
     for(const sample of tireSamples){
      point.copy(sample);tire.localToWorld(point);
      const main=Math.abs(point.x)<=360.05&&Math.hypot(point.y,point.z)<=80.05;
      const branch=point.z>=-.05&&point.z<=420.05&&Math.hypot(point.x,point.y)<=80.05;
      if(!main&&!branch)return false;
     }
    }
    return true;
   };
   const baseline=arm.currentCompression||0;
   if(fits(baseline)){
    if(baseline>0.005){if(arm.isFront)frontEngaged++;else if(arm.group.parent===rear)rearEngaged++;}
    maxCompression=Math.max(maxCompression,baseline);continue;
   }
   if(!fits(1)){unresolved++;continue;}
   let low=baseline,high=1;
   for(let i=0;i<7;i++){const mid=(low+high)/2;if(fits(mid))high=mid;else low=mid;}
   setArmCompression(arm,high);maxCompression=Math.max(maxCompression,high);
   if(arm.isFront)frontEngaged++;else if(arm.group.parent===rear)rearEngaged++;
  }
  root.updateMatrixWorld(true);
  const frontStroke=Math.max(...arms.filter(a=>a.isFront).map(a=>a.currentCompression*(a.centerY-a.baseY)*.35));
  return {unresolved,maxCompression,frontEngaged,rearEngaged,frontStroke};
 }
 function setState({explode=0,spin=0,rearRoll=0,steer=0,frontCompression=null,obstacle=0,teeFit=false,layer=4,shell=true}={}){
  front.position.x=-35-65*explode;front.rotation.y=steer;rear.position.x=45+65*explode;rotor.rotation.x=spin;
  const frontWheelRoll=-spin*p.radialWheelCenter/(p.wheelDiameter/2*Math.cos(p.frontWheelAngle*Math.PI/180));
  wheelRollers.forEach(w=>{w.group.rotation.y=w.kind==='front'?frontWheelRoll:rearRoll;});
  arms.forEach((arm,i)=>{
   const amount=arm.isFront?(frontCompression?Math.max(0,Math.min(1,frontCompression[i])):obstacle*(i===0?.78:.28)):0;
   setArmCompression(arm,amount);
  });
  parts.forEach(m=>{m.visible=m.userData.layer<=layer&&(shell||m.userData.layer!==4);});
  return teeFit?fitToTee():{unresolved:0,maxCompression:0,frontEngaged:0,rearEngaged:0,frontStroke:0};
 }
 return {root,groups,parts,rotor,arms,wheels,setState,parameters:p};
}
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const mix=(a,b,t)=>a+(b-a)*t;
// The 10° inclined front rollers imply a nominal screw lead of 2πR tan(α) per rotor turn.
// One drive-distance variable advances the path and front rotor. Rear roller rotation follows
// the rear unit's travelled distance / wheel radius. All path lengths are exhibition estimates.
function turnPose(phase,progress){
 const t=smooth(progress),r={pivotX:40,pivotZ:0,bodyAngle:0,steerAngle:0,driveDistance:0,rearTravel:0};
 if(phase===0){r.driveDistance=118*t;r.rearTravel=118*t;r.pivotX=158-r.driveDistance;}
 else if(phase===1){r.driveDistance=118;r.rearTravel=118;r.steerAngle=mix(0,Math.PI*58/180,t);}
 else if(phase===2){r.driveDistance=118+53*t;r.rearTravel=118+39*t;r.pivotX=mix(40,10,t);r.pivotZ=mix(0,45,t);r.bodyAngle=mix(0,Math.PI*22/180,t);r.steerAngle=mix(Math.PI*58/180,Math.PI*48/180,t);}
 else if(phase===3){r.driveDistance=171+78*t;r.rearTravel=157+121*t;r.pivotX=mix(10,0,t);r.pivotZ=mix(45,120,t);r.bodyAngle=mix(Math.PI*22/180,Math.PI/2,t);r.steerAngle=mix(Math.PI*48/180,0,t);}
 else{r.driveDistance=249+148*t;r.rearTravel=278+148*t;r.pivotX=0;r.pivotZ=mix(120,268,t);r.bodyAngle=Math.PI/2;}
 r.screwPitch=2*Math.PI*80*Math.tan(10*Math.PI/180);
 r.spin=r.driveDistance/r.screwPitch*2*Math.PI;
 r.rearRoll=-r.rearTravel/14;
 return r;
}
scope.RobotExhibit={createRobot,defaults,turnPose};
})(typeof window!=='undefined'?window:globalThis);
