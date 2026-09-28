const $=id=>document.getElementById(id);
let engine,initializing,model='exo',playing=false,phase=0,last=0,group,selected;
const files={exo:'PVSAE',vsca:'VSCA',odha:'ODHA'};
const descriptions={exo:'观察躯干姿态改变时，双侧驱动器与固定带的相对运动。',vsca:'从三根 PAM 到硅胶基体、重叠襟翼与密封外膜，逐层理解驱动器。',odha:'三腔压力差与纤维约束形成空间弯曲和扭转；此处展示螺旋变形的概念轨迹。'};
const notes={exo:'左右并联 VSCA 连接上部肩胸结构与骨盆腰带。',vsca:'蓝色：柔性基体 / 金色：PET 重叠襟翼 / 银色：端盖',odha:'ODHA 与 VSCA 属于不同结构路线；该模型展示螺旋抓取原理。'};
const partNotes=[[/PAM 编织网/,'约束气动人工肌肉的径向膨胀，使其形成轴向收缩。'],[/PAM \d/,'内部气动人工肌肉；三根沿圆周布置，构成 VSCA 的主动驱动单元。'],[/PET|襟翼/,'重叠薄片在负压压紧后增加层间摩擦，抵抗相对滑动。'],[/硅胶基体/,'包覆内部驱动单元，提供柔性连接和弹性恢复。'],[/外膜|外套/,'与端盖共同形成密封边界，使夹层能够施加负压。'],[/肩带|胸带/,'维持装置与上部躯干的位置关系，减少穿戴滑移。'],[/腰带|下部连接板/,'连接驱动器下端，构成骨盆附近的承重连接。'],[/背部连接板/,'连接左右驱动器上端，并将作用力传至肩胸固定结构。'],[/法兰|端盖|螺栓/,'连接与封装部件；隐藏连接形式及尺寸为比例示意。'],[/Kevlar/,'螺旋纤维约束与三腔差动共同形成 ODHA 的空间变形。'],[/独立气腔/,'ODHA 的三个独立气腔之一；图示用颜色区分，不对应实时压力数据。'],[/气路/,'用于区分正压驱动与负压增刚的示意气路，不代表实际管路布置。'],[/示意/,'用于表达穿戴位置的人体简化外形。']];
async function init(){
 if(engine)return;if(initializing)return initializing;
 initializing=(async()=>{
  const [T,O,M]=await Promise.all([import('./three.module.js'),import('./OrbitControls.js'),import('./models.js')]);
  const stage=$('stage'),scene=new T.Scene();scene.background=new T.Color(0xeaf1f5);
  const camera=new T.PerspectiveCamera(38,1,.01,100),renderer=new T.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;stage.appendChild(renderer.domElement);
  const control=new O.OrbitControls(camera,renderer.domElement);control.enableDamping=true;control.minDistance=.9;control.maxDistance=35;
  scene.add(new T.HemisphereLight(0xffffff,0x5b7787,2.3));
  for(const [pos,power] of [[[4,6,5],3],[[-5,1,-4],1.3]]){const l=new T.DirectionalLight(0xffffff,power);l.position.set(...pos);scene.add(l)}
  const grid=new T.GridHelper(14,28,0xb7cbd6,0xd4e0e7);grid.position.y=-2.77;scene.add(grid);
  engine={T,M,scene,camera,renderer,control,framing:null};
  new ResizeObserver(()=>{resize();fit(false)}).observe(stage);
  let pointerStart;
  renderer.domElement.addEventListener('pointerdown',e=>{pointerStart={x:e.clientX,y:e.clientY}});
  renderer.domElement.addEventListener('pointerup',e=>{if(pointerStart&&Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)<6)inspect(e);pointerStart=null});
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();stop();$('model-error').hidden=false});
  renderer.domElement.addEventListener('webglcontextrestored',()=>{$('model-error').hidden=true;rebuild()});
  renderer.setAnimationLoop(t=>{
   if(!$('viewer').open){last=t;return}
   if(playing&&t-last>=65){const dt=Math.min((t-last)/1000,.15);phase+=dt*Math.PI/4;$('motion').value=Math.round((1-Math.cos(phase))*50);rebuild();last=t}
   if(!playing)last=t;control.update();renderer.render(scene,camera);
  });
 })();try{await initializing}finally{initializing=null}
}
function resize(){if(!engine)return;const r=$('stage').getBoundingClientRect();if(r.width<1||r.height<1)return;engine.renderer.setSize(r.width,r.height,false);engine.camera.aspect=r.width/r.height;engine.camera.updateProjectionMatrix()}
function framing(){const {T,M}=engine,bounds=new T.Box3();for(const opts of [{},{pressure:1,explode:1},{bend:.75,side:0},{side:.38}]){const g=M.creators[model](opts);if(model==='vsca')g.position.x=-(opts.explode||0)*.95;bounds.expandByObject(g);M.dispose(g)}engine.framing=bounds.getBoundingSphere(new T.Sphere())}
function fit(reset=true,back=false){if(!engine?.framing)return;const {T,camera,control}=engine,{center,radius}=engine.framing;
 const v=T.MathUtils.degToRad(camera.fov),h=2*Math.atan(Math.tan(v/2)*camera.aspect);const distance=radius/Math.sin(Math.min(v,h)/2)*1.12;
 const dir=back?new T.Vector3(0,.04,-1):reset?new T.Vector3(4,2.2,-7.4):camera.position.clone().sub(control.target);if(dir.lengthSq()<.01)dir.set(4,2.2,-7.4);
 control.target.copy(center);camera.position.copy(center).addScaledVector(dir.normalize(),distance);control.maxDistance=Math.max(35,distance*2);camera.far=Math.max(100,distance*5);camera.updateProjectionMatrix();control.update()
}
function stop(){playing=false;$('play').textContent='播放动作'}
function rebuild(){if(!engine)return;const {scene,M}=engine;if(group){scene.remove(group);M.dispose(group)}selected=null;const p=+$('motion').value/100,e=+$('explode').value/100;
 group=M.creators[model]({pressure:p,explode:e,transparent:$('transparent').checked,vacuum:+$('vacuum').value,bend:$('pose').value==='bend'?p*.75:0,side:$('pose').value==='side'?p*.38:0});if(model==='vsca')group.position.x=-e*.95;scene.add(group);
 $('explode-out').value=Math.round(e*100)+'%';$('motion-out').value=Math.round(p*100)+'%';$('vac-note').textContent=+$('vacuum').value?'金色加深表示襟翼受压增刚；本演示不计算真实刚度。':'负压调节刚度，不直接设定收缩长度。'
}
function inspect(event){if(!engine||!group)return;stop();const {T,camera,renderer}=engine,r=renderer.domElement.getBoundingClientRect(),pointer=new T.Vector2((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1),ray=new T.Raycaster();group.updateMatrixWorld(true);ray.setFromCamera(pointer,camera);
 const hits=ray.intersectObject(group,true),hit=hits.find(h=>h.object.material.opacity>=.32)||hits[0];
 if(selected)selected.material.emissive.set(0);selected=hit?.object;
 if(selected){selected.material.emissive.set(0x29534e);$('part-title').textContent=selected.name||'结构部件';$('part-detail').textContent=partNotes.find(([re])=>re.test(selected.name))?.[1]||'根据论文结构图复原的示意部件。'}
}
function changeModel(){model=$('model').value;stop();phase=0;$('motion').value=0;$('explode').value=0;$('transparent').checked=false;$('vacuum').value='0';$('pose-options').hidden=model!=='exo';$('vac-controls').hidden=model==='odha';$('backview').textContent=model==='exo'?'背部视角':'正面视角';$('model-desc').textContent=descriptions[model];$('stagenote').textContent=notes[model];$('model-download').href='assets/'+files[model]+'-schematic.glb';$('fallback-video').href='assets/'+model+'-demo.mp4';$('part-title').textContent='点选模型上的部件';$('part-detail').textContent='旋转找到部件，再轻点查看名称与作用。';if(engine){framing();rebuild();resize();fit()}}
document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',async()=>{$('model').value=b.dataset.open;model=b.dataset.open;if(!$('viewer').open)$('viewer').showModal();document.body.style.overflow='hidden';changeModel();try{await init();$('model-error').hidden=true;$('play').disabled=false;changeModel()}catch(err){console.error(err);$('model-error').hidden=false;$('play').disabled=true}}));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.close).close()));
document.querySelectorAll('dialog').forEach(d=>{d.addEventListener('close',()=>{document.body.style.overflow='';stop()});d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}})});
$('model').addEventListener('change',changeModel);
for(const id of ['explode','transparent','motion','pose','vacuum'])$(id).addEventListener('input',()=>{stop();phase=Math.acos(1-(+$('motion').value/50));rebuild()});
$('play').addEventListener('click',()=>{if(!engine)return;playing=!playing;phase=Math.acos(1-(+$('motion').value/50));last=performance.now();$('play').textContent=playing?'暂停动作':'播放动作'});
$('reset').addEventListener('click',()=>fit());$('backview').addEventListener('click',()=>fit(true,true));
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
document.querySelectorAll('[data-img]').forEach(b=>b.addEventListener('click',()=>{$('large-image').src=b.dataset.img;$('large-image').alt=b.dataset.caption;$('large-caption').textContent=b.dataset.caption;$('lightbox').showModal();document.body.style.overflow='hidden'}));
