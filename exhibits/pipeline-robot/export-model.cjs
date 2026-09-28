const fs=require('fs');
global.window=globalThis;
global.THREE=require('./vendor/three.min.js');
require('./vendor/GLTFExporter.js');
require('./model-source.js');
global.FileReader=class{
 readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;if(this.onloadend)this.onloadend();});}
 readAsDataURL(blob){blob.arrayBuffer().then(value=>{this.result='data:'+blob.type+';base64,'+Buffer.from(value).toString('base64');if(this.onloadend)this.onloadend();});}
};
const robot=RobotExhibit.createRobot(THREE);
fs.writeFileSync('models/parameters.json',JSON.stringify({units:'mm',inputs:robot.parameters,documentedAnchors:['200mm nominal length','28mm wheel diameter','10deg front wheel angle','160mm T-pipe internal diameter'],displayMotion:{frontPivotX:-35,turnPhaseMilliseconds:[8000,10000,10000,17000,15000],peakRelativeSteerDegrees:58,nominalScrewPitchMm:2*Math.PI*80*Math.tan(10*Math.PI/180),freeWheelCenterRadiusMm:69,frontTravelFraction:.35,otherArmsTravelFraction:.55,source:'model-source.js / RobotExhibit.turnPose() and createRobot().setState()'},estimated:'Free wheel extension, screw lead, pivot location, stroke fractions, relative turn limit, rear rolling path, shell and internal arrangement are exhibition estimates, not CAD measurements. Static GLB is the unloaded unsteered base pose.'},null,2));
fs.writeFileSync('models/editable-scene.json',JSON.stringify(robot.root.toJSON()));
robot.root.scale.setScalar(.001);
robot.root.userData.units='metres';
robot.root.updateMatrixWorld(true);
new THREE.GLTFExporter().parse(robot.root,data=>{
 fs.writeFileSync('models/pipeline-robot.glb',Buffer.from(data));
 let meshes=0;robot.root.traverse(object=>{if(object.isMesh)meshes++;});
 console.log(JSON.stringify({file:'models/pipeline-robot.glb',bytes:data.byteLength,meshes,arms:robot.arms.length,units:'metres'}));
},{binary:true,onlyVisible:true});
