// Original interactive sketches from ziyoutang.github.io/p5js.html.
const sketches = [
  {
    "slug": "wireframe",
    "title": "wirefram-ed",
    "script": "var canvas;\n\nfunction windowResized () {\n resizeCanvas(windowWidth, windowHeight);\n}\n\n\n// add more her\n\n\n// video source: https://pin.it/3Q9jhNQ\nlet img;\nlet vid;\nlet theta = 0;\n\nfunction setup() {\n    canvas = createCanvas(windowWidth, windowHeight, WEBGL);\n    canvas.position(0,0);\n    canvas.style('position', 'fixed');\n    canvas.style('z-index', '-10');\n  pg = createGraphics(200, 200);\n  pg.textSize(75);\n  img = loadImage('bones.gif');\n  vid = createVideo(['birthday.mp4']);\n  vid.elt.muted = true;\n  vid.loop();\n  vid.hide();\n  textSize(32);\n  text('word', 10, 30);\n  fill(0, 102, 153);\n}\n\nfunction draw() {\n  background(50,10,220);\n  ambientLight(250); // white light\n  ambientMaterial(280, 127, 80); // coral material\n  sphere(50);\n  translate(-300, 0, 0);\n  push();\n  ambientLight(250); // white light\n  ambientMaterial(170, 127, 80);\n  push();\n  rotateZ(theta * mouseX * 0.001);\n  rotateX(theta * mouseX * 0.001);\n  rotateY(theta * mouseY * 0.001);\n  //pass image as texture\n  pg.background(20,225);\n  pg.text('hello!', 50, 600);\n  texture(pg);\n  ambientLight(250); // white light\n  ambientMaterial(0, 127, 80);\n  cone(180);\n  pop();\n  translate(440, 0, 0);\n  push();\n  rotateZ(theta * 0.1);\n  rotateX(theta * 0.1);\n  rotateY(theta * 0.1);\n  texture(img);\n  torus(100,70);\n  pop();\n  theta += 0.05;\n  rotateY(millis() / 1000);\n  \n  const m = 30;\n\n  const topR = 1000 * noise(frameCount / m);\n  const topG = 1000 * noise(1000 + frameCount / m);\n  const topB = 1000 * noise(2000 + frameCount / m);\n  const bottomR = 255 * noise(3000 + frameCount / m);\n  const bottomG = 255 * noise(4000  + frameCount / m);\n  const bottomB = 255 * noise(5000 + frameCount / m);\n\n  const topColor = color(topR, topG, topB);\n  const bottomColor = color(bottomR, bottomG, bottomB);\n\n  for(let y = 0; y < height; y++) {\n    const lineColor = lerpColor(topColor, bottomColor, y / height);\n\n    stroke(lineColor);\n    line(0, y, width, y);\n    \n}\n}"
  },
  {
    "slug": "pink",
    "title": "P!NK",
    "script": "var canvas;\n\nfunction windowResized () {\n resizeCanvas(windowWidth, windowHeight);\n}\n\nfunction setup() {\ncanvas = createCanvas(windowWidth, windowHeight,WEBGL);\ncanvas.position(0,0);\ncanvas.style('position', 'fixed');\ncanvas.style('z-index', '-10');\n    background(0,200,225);\n  }\n  \n  function draw() {\n    // Call the variableEllipse() method and send it the\n    // parameters for the current mouse position\n    // and the previous mouse position\n    variableEllipse(mouseX, mouseY, pmouseX, pmouseY);\n  }\n  \n  // The simple method variableEllipse() was created specifically\n  // for this program. It calculates the speed of the mouse\n  // and draws a small ellipse if the mouse is moving slowly\n  // and draws a large ellipse if the mouse is moving quickly\n  \n  function variableEllipse(x, y, px, py) {\n    let speed = abs(x - px) + abs(y - py);\n    stroke(speed);\n    torus(30,speed,speed,10);\n    let ellipseRed = map(mouseX, 0, width, 0, 255);\n    let rectBlue = map(mouseY, 0, height, 0, 255);\n      fill(ellipseRed, 200, 150);\n    sphere(50,speed,60);\n    fill(255, rectBlue, 200);\n    cone(speed,266,speed,20,70);\n  }\n  "
  },
  {
    "slug": "circus",
    "title": "YOUR circus",
    "script": "var canvas;\n\nfunction windowResized () {\n resizeCanvas(windowWidth, windowHeight);\n}\n\n\n// add more here\n\n\nconst radius = 200;\n\nfunction setup() {\n    canvas = createCanvas(windowWidth, windowHeight,WEBGL);\n    canvas.position(0,0);\n    canvas.style('position', 'fixed');\n    canvas.style('z-index', '-10');\n    //createCanvas(710, 400, WEBGL);\n    noStroke();\n    fill(0,200,255);\n    background(120,0,30);\n}\n\nfunction draw() {\n  let speed = abs(mouseX - 20) + abs(mouseY +100)\n  noStroke();\n  background(120,0,30);\n  circle(mouseX,mouseY,40,80);\n  const dirY = (mouseY / height - 0.5) * 4;\n  const dirX = (mouseX / width - 0.5) * 4;\n  directionalLight(40, 204, 60, dirX, dirY, 1);\n  translate(-1.5 * radius, 0, 0);\n  cone(radius);\n    directionalLight(100, speed, 255, dirX, speed, speed);\n  translate(3 * radius, speed, 0);\n  cone(radius);\n  directionalLight(255, 255, 0, dirX, dirY, 1);\n  translate(-1.5 * radius, 0, 0);\n  torus(radius);\n  directionalLight(255, 20, 60, dirX, dirY, 1);\n  translate(-1.5 * radius, 0, 0);\n  sphere(40);\n\n\n}\n"
  }
];

export function playgroundPage(slug = 'wireframe') {
  const selected = sketches.find(sketch => sketch.slug === slug) || sketches[0];
  return `<section class="gallery-page playground-page sketch-${selected.slug}" aria-labelledby="playground-title"><span class="gallery-title-glow" aria-hidden="true"></span><h1 id="playground-title" class="gallery-page-title">p5js playground</h1><nav class="playground-tabs" aria-label="Playground sketches">${sketches.map(sketch => `<a href="#/playground/${sketch.slug}"${sketch === selected ? ' aria-current="page"' : ''}>${sketch.title}</a>`).join('')}</nav><iframe class="playground-canvas" data-sketch="${selected.slug}" title="${selected.title} — interactive p5js sketch" allow="autoplay" sandbox="allow-scripts allow-same-origin"></iframe></section>`;
}

export function setupPlayground() {
  const frame = document.querySelector('.playground-canvas');
  if (!frame) return;
  const sketch = sketches.find(sketch => sketch.slug === frame.dataset.sketch);
  frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><base href="https://ziyoutang.github.io/"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}canvas{display:block}</style></head><body><script src="https://cdn.jsdelivr.net/npm/p5@1.4.1/lib/p5.js"></script><script>${sketch.script}\nconst portfolioDraw=draw;draw=function(){push();scale(.846);portfolioDraw();pop();};</script></body></html>`;
}

export function installationPlaygroundPage() {
  return `<section class="gallery-page installation-playground-page" aria-labelledby="installation-playground-title"><span class="gallery-title-glow" aria-hidden="true"></span><h1 id="installation-playground-title" class="gallery-page-title">3D Model Playground</h1><div class="model-exhibit" data-model-exhibit role="group" aria-label="Interactive Nomad sculpture"></div><div class="model-exhibit-toolbar"><p data-model-status role="status">loading your sculpture…</p><button type="button" data-model-reset>Reset view</button></div></section>`;
}
