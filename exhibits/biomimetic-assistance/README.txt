仿生变刚度驱动器与外骨骼组合展品 V1.1

打开方法：解压全部文件，双击 index.html。三维交互需要支持 WebGL 的浏览器。
全部图片、三维引擎、GLB模型、演示MP4均为本地资源。
点击“打开三维交互”，可观察整机、VSCA及ODHA；旋转、缩放、拆解、透视及播放动作。
assets/exhibit-notes.html：讲解词、资料对应关系、接入说明。
assets/exhibit-data.json：参考展馆格式的接入数据。
模型是论文结构图复原示意，不是原始CAD；MP4为模型动画，不是实机录像。
原网站未直接修改。本展品可以作为新目录接入原站。

技术资源：Three.js (MIT License)，模型与网页源代码在assets内。

更新：视角自适应手机屏幕；支持点选部件；PAM编织网同步变形；新增ODHA视频与三段中文字幕。
原站接入说明：integration/index.html。
单独模型入口：viewer.html?model=exo（外骨骼）、vsca（驱动器）或odha（螺旋驱动器）。
