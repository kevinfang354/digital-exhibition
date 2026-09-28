(()=>{'use strict';
const $=id=>document.getElementById(id);
const dialog=$('viewer-dialog');
let renderer,scene,camera,orbit,robot,turnRig,playing=false,last=0,spin=0,loadedExternal=null,selected=null,dirty=true,lastRender=0,demo=null,demoStep=-1,followFront=false;
const state={explode:0,layer:4,shell:true,obstacle:0};
const previews={
  whole:['robot-original.png','整机实物','实物结构展示。三维模型为简化重建，用于观察主要结构关系。'],
  arm:['spring-arm.png','弹性伸缩臂','弹簧与伸缩杆帮助轮组适应管壁。'],
  test:['tpipe-sequence.png','T形管实验','查看T形管道中的样机实验画面。']
};
const demoSteps={
  turn:['前端螺旋行进，后轮贴壁滚动至分支口','螺旋暂歇，前单元转向并保持弹簧预紧','前端贴壁螺旋，开始进入支管','前端持续螺旋，后轮滚动推进并反向调节转向','后轮跟入支管，整机继续向上爬升'],
  obstacle:['驱动轮接近凸台，弹簧保持弹性支撑','轮子经过凸台时，弹性臂缓慢压缩','轮组通过后，弹性臂逐渐恢复']
};
const config={turn:{phases:[8000,10000,10000,17000,15000]},obstacle:{phases:[6000,6000,6000]}};
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const lerp=(a,b,t)=>a+(b-a)*t;

document.querySelectorAll('[data-preview]').forEach(b=>b.onclick=()=>{
  const a=previews[b.dataset.preview];
  $('hero-image').src='assets/'+a[0];$('hero-image').alt=a[1];
  $('image-title').textContent=a[1];$('image-caption').textContent=a[2];
  document.querySelectorAll('[data-preview]').forEach(x=>x.classList.toggle('selected',x===b));
});
function status(s){$('viewer-status').textContent=s;}
function renderDemoSteps(kind,active=-1,finished=false){
  const list=$('action-steps');if(!list)return;list.innerHTML='';
  (demoSteps[kind]||[]).forEach((label,i)=>{
    const li=document.createElement('li');li.textContent=(i+1)+' · '+label;
    if(i===active)li.classList.add('active');else if(finished||i<active)li.classList.add('complete');
    list.appendChild(li);
  });
}
function duration(kind){return config[kind].phases.reduce((a,b)=>a+b,0);}
function phaseAt(kind,elapsed){
  let start=0;const phases=config[kind].phases;
  for(let i=0;i<phases.length;i++){
    if(elapsed<start+phases[i]||i===phases.length-1)return {index:i,start,span:phases[i],progress:Math.max(0,Math.min(1,(elapsed-start)/phases[i]))};
    start+=phases[i];
  }
  return {index:phases.length-1,start:duration(kind)-phases.at(-1),span:phases.at(-1),progress:1};
}
function syncDemoButtons(){
  const button=$('play-action');if(button){button.textContent=demo?(demo.playing?'暂停演示':'继续演示'):'慢速播放';button.classList.toggle('active',!!demo&&demo.playing);}
  const next=$('next-action');if(next)next.textContent=demo?'下一阶段':'从第一阶段开始';
}
function syncTimeline(kind,elapsed){
 const slider=$('action-timeline');if(!slider)return;
 const total=duration(kind);slider.value=Math.round(1000*Math.min(1,elapsed/total));
 const seconds=Math.floor(elapsed/1000),minutes=Math.floor(seconds/60);
 $('timeline-value').textContent=minutes+':'+String(seconds%60).padStart(2,'0')+' / '+Math.floor(total/1000)+'秒';
}
function configureCamera(forTurn){
  if(!camera||!orbit)return;
  if(forTurn){
    camera.up.set(0,0,1);camera.position.set(230,730,330);orbit.target.set(55,0,115);orbit.minDistance=190;orbit.maxDistance=1500;
  }else{
    camera.up.set(0,1,0);camera.position.set(-255,190,335);orbit.target.set(5,0,0);orbit.minDistance=190;orbit.maxDistance=1000;
  }
  orbit.update();dirty=true;
}
function restoreStructureScene(){
  if(turnRig)turnRig.root.visible=false;
  followFront=false;$('front-detail').hidden=true;$('front-detail').textContent='跟随前端细节';
  if(robot){robot.root.visible=!loadedExternal;robot.root.position.set(0,0,0);robot.root.rotation.set(0,0,0);robot.setState({...state,spin:0,steer:0,frontCompression:null,obstacle:0});}
  configureCamera(false);
}
function cancelDemo(message='动作已停止。可重新选择演示。'){
  const hadTurn=demo&&demo.kind==='turn';demo=null;demoStep=-1;syncDemoButtons();
  if(hadTurn)restoreStructureScene();
  const node=$('action-status');if(node)node.textContent=message;
}
function buildTurnRig(T){
  const root=new T.Group();root.name='160毫米内径T形管道示意';root.visible=false;
  const pipeMaterial=new T.MeshStandardMaterial({color:0x4c91a2,roughness:.55,metalness:.1,transparent:true,opacity:.105,side:T.DoubleSide,depthWrite:false});
  function pipe(length,center,axis){
    const mesh=new T.Mesh(new T.CylinderGeometry(80,80,length,64,1,true),pipeMaterial);
    mesh.position.set(center[0],center[1],center[2]);
    if(axis==='x')mesh.rotation.z=Math.PI/2;else mesh.rotation.x=Math.PI/2;
    root.add(mesh);
  }
  pipe(720,[0,0,0],'x');pipe(420,[0,0,210],'z');
  const rimMaterial=new T.MeshStandardMaterial({color:0x4d8794,roughness:.48,metalness:.2});
  function rim(position,normal){
    const mesh=new T.Mesh(new T.TorusGeometry(80,2.1,8,64),rimMaterial);mesh.position.set(position[0],position[1],position[2]);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(normal[0],normal[1],normal[2]));root.add(mesh);
  }
  rim([-360,0,0],[1,0,0]);rim([360,0,0],[1,0,0]);rim([0,0,420],[0,0,1]);
  return {root};
}
function setTurnPose(phase,u){
  if(!robot)return;
  const pose=RobotExhibit.turnPose(phase,u),c=Math.cos(pose.bodyAngle),s=Math.sin(pose.bodyAngle);
  robot.root.position.set(pose.pivotX+35*c,0,pose.pivotZ-35*s);
  robot.root.rotation.set(0,pose.bodyAngle,0);
  const fit=robot.setState({layer:4,shell:true,spin:pose.spin,rearRoll:pose.rearRoll,steer:pose.steerAngle,teeFit:true});
  $('front-turns').textContent=(pose.spin/(2*Math.PI)).toFixed(1)+' 转';
  $('front-preload').textContent=fit.frontEngaged+'/3 臂 · '+fit.frontStroke.toFixed(1)+' mm';
  $('rear-roll').textContent=(Math.abs(pose.rearRoll)/(2*Math.PI)).toFixed(1)+' 转';
  if(followFront&&camera&&orbit){
    const frontPos=robot.rotor.getWorldPosition(new THREE.Vector3());frontPos.z+=8;
    const shift=frontPos.sub(orbit.target);orbit.target.add(shift);camera.position.add(shift);orbit.update();dirty=true;
  }
}
function finishDemo(kind){
  const steps=demoSteps[kind];state.obstacle=0;spin=0;
  if(kind==='turn')setTurnPose(4,1);else if(robot)robot.setState({...state,spin:0,obstacle:0});
  renderDemoSteps(kind,steps.length-1,true);
  $('action-status').textContent=kind==='turn'?'转向展示结束。前端转数、轮子滚动和弹簧贴壁压缩为模型联动；真实载荷与传动比待实测。':'慢速越障示意完成。动画只表示弹性臂压缩与恢复。';
  status(kind==='turn'?'T形支管 · 整机轮组与转向铰接展示':'越障顺应示意 · 慢速弹性臂压缩');
  syncTimeline(kind,duration(kind));
  demo=null;demoStep=-1;syncDemoButtons();dirty=true;
  return kind==='turn'?null:{...state,spin:0,obstacle:0};
}
function poseForDemo(elapsed){
  if(!demo)return null;
  const kind=demo.kind,total=duration(kind),steps=demoSteps[kind];
  if(elapsed>=total)return finishDemo(kind);
  const phase=phaseAt(kind,elapsed);
  if(phase.index!==demoStep){
    demoStep=phase.index;renderDemoSteps(kind,phase.index);
    $('action-status').textContent=(phase.index+1)+' / '+steps.length+' · '+steps[phase.index];
  }
  if(kind==='turn'){setTurnPose(phase.index,phase.progress);return null;}
  let obstacle=0;
  if(phase.index===1)obstacle=ease(phase.progress);
  else if(phase.index===2)obstacle=1-ease(phase.progress);
  return {...state,spin:0,obstacle};
}
function startDemo(kind,paused=false){
  if(!robot||loadedExternal)return;
  restoreStructureScene();
  stopSpin();state.explode=0;state.obstacle=0;state.shell=true;state.layer=4;
  $('view-mode').value='whole';$('layer').value=4;$('explode').value=0;apply(false);
  demo={kind,elapsed:0,playing:!paused};demoStep=-1;spin=0;
  if(kind==='turn'){
    turnRig.root.visible=true;robot.root.visible=true;configureCamera(true);
    $('canvas-note').innerHTML='前端螺旋轮贴壁预紧 · 后轮滚动随动推进<br>拖动旋转 · 滚轮/双指缩放 · 点选部件';
    $('mode-note').textContent='约60秒。前端倾斜轮转动与行进距离联动；后部电机经传动轴提供前端螺旋动力，后轮贴壁滚动支撑机身跟进。';
    status('T形支管 · 同一整机模型展示铰接与轮组');
  }else{
    turnRig.root.visible=false;robot.root.visible=true;configureCamera(false);
    $('canvas-note').innerHTML='拖动旋转 · 滚轮/双指缩放 · 点选部件<br>慢速显示弹性臂压缩与恢复';
    $('mode-note').textContent='越障模式只显示弹性臂的相对压缩与恢复，不模拟障碍接触轨迹或实际越障高度。';
    status('越障顺应示意 · 慢速弹性臂压缩');
  }
  $('turn-legend').hidden=kind!=='turn';
  $('traction-readout').hidden=kind!=='turn';
  $('front-detail').hidden=kind!=='turn';
  syncDemoButtons();syncTimeline(kind,0);dirty=true;
  if(kind==='turn')setTurnPose(0,0);
}
function init(){
  const T=THREE;scene=new T.Scene();camera=new T.PerspectiveCamera(37,1,1,4000);camera.position.set(-255,190,335);
  try{renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});}catch{renderer=new ExhibitCanvasRenderer();}
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;$('canvas-wrap').appendChild(renderer.domElement);
  scene.add(new T.HemisphereLight(0xffffff,0x80949e,1.5));
  const light=new T.DirectionalLight(0xffffff,2.2);light.position.set(-180,250,180);scene.add(light);
  const fill=new T.DirectionalLight(0xccefff,1);fill.position.set(100,70,-100);scene.add(fill);
  robot=RobotExhibit.createRobot(T);scene.add(robot.root);turnRig=buildTurnRig(T);scene.add(turnRig.root);
  orbit=new T.OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.minDistance=190;orbit.maxDistance=1000;orbit.target.set(5,0,0);orbit.update();orbit.addEventListener('change',()=>dirty=true);
  const grid=new T.GridHelper(600,24,0xc6d5dc,0xe0e9ee);grid.position.y=-95;scene.add(grid);
  populate(robot.parts);renderDemoSteps($('action-mode').value);const ray=new T.Raycaster();let down;
  renderer.domElement.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);
  renderer.domElement.addEventListener('pointerup',e=>{
    if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
    const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);
    const hits=ray.intersectObjects(loadedExternal?[loadedExternal]:robot.parts,true).filter(h=>{let o=h.object;while(o){if(!o.visible)return false;o=o.parent;}return true;});
    if(hits[0])selectPart(hits[0].object);
  });
  new ResizeObserver(resize).observe($('canvas-wrap'));resize();status('已加载 · 3个结构单元 / 8组弹性伸缩臂'+(renderer.isSoftware?' · 兼容渲染':''));requestAnimationFrame(tick);
  if(location.protocol!=='file:')new T.GLTFLoader().load('models/pipeline-robot.glb',g=>{let n=0;g.scene.traverse(o=>{if(o.isMesh)n++;});$('canvas-wrap').dataset.glbVerified=String(n);},undefined,()=>{$('canvas-wrap').dataset.glbVerified='failed';});
}
function populate(parts){
  $('part-list').innerHTML='<option value="">选择部件…</option>';const seen=new Set();
  parts.forEach(m=>{if(seen.has(m.name))return;seen.add(m.name);const opt=document.createElement('option');opt.value=m.uuid;opt.textContent=m.name;$('part-list').appendChild(opt);});
}
function selectPart(m){
  dirty=true;if(selected)selected.material=selected.userData.originalMaterial;selected=m;
  m.userData.originalMaterial=m.material;m.material=m.material.clone();if(m.material.emissive)m.material.emissive.setHex(0x17666a);
  $('part-name').textContent=m.name||'导入模型部件';$('part-evidence').textContent=m.userData.displayNote||'结构展示部件，局部几何已简化。';
}
function resize(){
  if(!renderer)return;const box=$('canvas-wrap'),w=box.clientWidth,h=box.clientHeight;if(!w||!h)return;
  renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();dirty=true;
}
function tick(t){
  requestAnimationFrame(tick);const dt=Math.min((t-last)/1000,.05);last=t;if(!dialog.open)return;
  if(playing)spin+=dt*.35;if(demo&&demo.playing)demo.elapsed+=dt*1000;
  let pose=null;if(demo)pose=poseForDemo(demo.elapsed);
  if(!loadedExternal&&robot&&!(turnRig&&turnRig.root.visible))robot.setState(pose||{...state,spin,obstacle:state.obstacle||0});
  if(demo&&demo.playing)syncTimeline(demo.kind,demo.elapsed);
  orbit.update();
  if((dirty||playing||(demo&&demo.playing))&&(!renderer.isSoftware||t-lastRender>90)){renderer.render(scene,camera);dirty=false;lastRender=t;}
}
function apply(stopAction=true){
  if(stopAction){cancelDemo();restoreStructureScene();}
  dirty=true;state.explode=+$('explode').value;state.layer=+$('layer').value;
  $('explode-value').textContent=Math.round(state.explode*100)+'%';
}
function stopSpin(){
  playing=false;$('play-spin').textContent='播放螺旋驱动（慢速）';$('play-spin').classList.remove('active');
}
function toggleDemo(){
  if(!demo){startDemo($('action-mode').value);return;}
  demo.playing=!demo.playing;syncDemoButtons();
  $('action-status').textContent=demo.playing?'慢速演示继续播放，可随时暂停或逐阶段查看。':'演示已暂停，可继续播放或手动前进。';dirty=true;
}
function nextDemoStep(){
  if(!demo){startDemo($('action-mode').value,true);return;}
  const current=phaseAt(demo.kind,demo.elapsed),phases=config[demo.kind].phases,target=current.index+1;
  demo.playing=false;
  if(target>=phases.length){demo.elapsed=duration(demo.kind);const pose=poseForDemo(demo.elapsed);if(pose&&robot&&!loadedExternal)robot.setState(pose);return;}
  let start=0;for(let i=0;i<target;i++)start+=phases[i];
  demo.elapsed=start;const pose=poseForDemo(demo.elapsed);if(pose&&robot&&!loadedExternal)robot.setState(pose);
  syncTimeline(demo.kind,demo.elapsed);syncDemoButtons();dirty=true;
}
function reset(){
  stopSpin();demo=null;demoStep=-1;syncDemoButtons();spin=0;
  if(loadedExternal){scene.remove(loadedExternal);loadedExternal=null;robot.root.visible=true;populate(robot.parts);$('load-glb').value='';status('已加载 · 3个结构单元 / 8组弹性伸缩臂');}
  restoreStructureScene();$('turn-legend').hidden=$('action-mode').value!=='turn';
  document.querySelectorAll('.controls button,.controls select,.controls input[type=range]').forEach(e=>e.disabled=false);
  $('view-mode').value='whole';$('explode').value=0;$('layer').value=4;state.shell=true;state.obstacle=0;apply(false);
  $('action-status').textContent='选择动作后，可慢速播放、暂停或逐阶段查看。';
  $('canvas-note').innerHTML='拖动旋转 · 滚轮/双指缩放 · 点选部件<br>整机模型同时用于结构与动作观察';
  $('mode-note').textContent=$('action-mode').value==='turn'?'前端倾斜轮贴壁旋转并向支管行进，后轮滚动随动推进；约60秒，可暂停、逐段查看。':'越障模式只显示弹性臂的相对压缩与恢复，不模拟障碍接触轨迹或实际越障高度。';
  $('traction-readout').hidden=true;
  syncTimeline($('action-mode').value,0);
  renderDemoSteps($('action-mode').value);configureCamera(false);
  if(selected){selected.material=selected.userData.originalMaterial;selected=null;}
  $('part-name').textContent='点选模型部件';$('part-evidence').textContent='点选结构查看部件名称。';
}
function openViewer(){
  dialog.showModal();document.body.classList.add('modal-open');
  try{if(!renderer)init();resize();}
  catch(e){status('当前浏览器无法显示三维。请使用支持WebGL的Chrome或Edge，或下载GLB模型。');}
}
$('open-viewer').onclick=openViewer;
$('close-viewer').onclick=()=>dialog.close();
dialog.addEventListener('close',()=>{stopSpin();cancelDemo('动作已停止。重新打开后可再次播放。');restoreStructureScene();document.body.classList.remove('modal-open');});
$('view-mode').onchange=()=>{
  const mode=$('view-mode').value;state.shell=mode!=='inside';$('explode').value=mode==='explode'?1:0;
  stopSpin();spin=0;apply();if(mode==='explode'){camera.position.set(-360,245,450);orbit.target.set(0,0,0);orbit.update();}
};
['explode','layer'].forEach(id=>$(id).oninput=()=>apply());
$('action-mode').onchange=()=>{
  cancelDemo('动作模式已切换。可慢速播放或逐阶段查看。');restoreStructureScene();
  $('turn-legend').hidden=$('action-mode').value!=='turn';
  $('mode-note').textContent=$('action-mode').value==='turn'?'前端倾斜轮贴壁旋转并向支管行进，后轮滚动随动推进；约60秒，可暂停、逐段查看。':'越障模式只显示弹性臂的相对压缩与恢复，不模拟障碍接触轨迹或实际越障高度。';
  $('traction-readout').hidden=true;
  syncTimeline($('action-mode').value,0);
  renderDemoSteps($('action-mode').value);
};
$('play-action').onclick=toggleDemo;$('next-action').onclick=nextDemoStep;
$('front-detail').onclick=()=>{
  if(!robot||!turnRig.root.visible)return;
  followFront=!followFront;
  $('front-detail').textContent=followFront?'返回T管全景':'跟随前端细节';
  if(followFront){
    robot.root.updateMatrixWorld(true);
    const focus=robot.rotor.getWorldPosition(new THREE.Vector3());focus.z+=8;
    const view=camera.position.clone().sub(orbit.target).normalize();
    orbit.target.copy(focus);camera.position.copy(focus).addScaledVector(view,390);orbit.update();
  }else configureCamera(true);
  dirty=true;
};
$('action-timeline').oninput=()=>{
  if(!demo)startDemo($('action-mode').value,true);
  if(!demo)return;
  demo.playing=false;demo.elapsed=Math.min(duration(demo.kind)-1,+$('action-timeline').value/1000*duration(demo.kind));
  const pose=poseForDemo(demo.elapsed);if(pose&&robot)robot.setState(pose);
  syncTimeline(demo.kind,demo.elapsed);syncDemoButtons();dirty=true;
};
$('play-spin').onclick=()=>{
  if(playing){stopSpin();return;}
  cancelDemo('已切换到螺旋驱动。');restoreStructureScene();$('turn-legend').hidden=true;
  $('explode').value=0;$('view-mode').value='whole';apply();playing=true;
  $('play-spin').textContent='暂停前端旋转';$('play-spin').classList.add('active');
  status('前端螺旋驱动原理示意 · 慢速旋转；未模拟管壁接触或轴向推进');
};
$('reset').onclick=reset;
$('front-view').onclick=()=>{camera.up.set(0,1,0);camera.position.set(-460,0,0);orbit.target.set(0,0,0);orbit.update();};
$('side-view').onclick=()=>{camera.up.set(0,1,0);camera.position.set(0,30,460);orbit.target.set(0,0,0);orbit.update();};
$('part-list').onchange=()=>{
  const list=[];(loadedExternal||robot.root).traverse(o=>{if(o.isMesh)list.push(o);});
  const p=list.find(o=>o.uuid===$('part-list').value);if(p)selectPart(p);
};
$('load-glb').onchange=async e=>{
  const f=e.target.files[0];if(!f)return;stopSpin();cancelDemo('已打开外部模型，展台动作已停用。');restoreStructureScene();
  try{
    const data=await f.arrayBuffer();
    new THREE.GLTFLoader().parse(data,'',g=>{
      if(loadedExternal)scene.remove(loadedExternal);loadedExternal=g.scene;scene.add(loadedExternal);robot.root.visible=false;
      const box=new THREE.Box3().setFromObject(loadedExternal),size=box.getSize(new THREE.Vector3()).length();if(size===0)throw Error('empty');
      const scale=230/size;loadedExternal.scale.multiplyScalar(scale);const c=new THREE.Box3().setFromObject(loadedExternal).getCenter(new THREE.Vector3());loadedExternal.position.sub(c);
      camera.position.set(-255,190,335);orbit.target.set(0,0,0);const parts=[];loadedExternal.traverse(o=>{if(o.isMesh)parts.push(o);});
      populate(parts);dirty=true;status('已打开本地GLB：'+f.name+' · '+parts.length+'个网格');
      ['view-mode','layer','explode','action-mode','play-action','next-action','play-spin'].forEach(id=>$(id).disabled=true);
    },()=>status('GLB文件读取失败，请确认文件完整。'));
  }catch{status('无法读取此文件，请选择有效GLB。');}
};
})();
