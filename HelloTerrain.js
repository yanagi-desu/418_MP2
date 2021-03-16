
/**
 * @file A simple WebGL example drawing central Illinois style terrain
 * @author Eric Shaffer <shaffer1@illinois.edu>
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global A simple GLSL shader program */
var shaderProgram;

/** @global The Modelview matrix */
var mvMatrix = mat4.create();

/** @global The Projection matrix */
var pMatrix = mat4.create();

/** @global The Normal matrix */
var nMatrix = mat3.create();

/** @global The matrix stack for hierarchical modeling */
var mvMatrixStack = [];

/** @global The angle of rotation around the y axis */
var viewRot = 0;

/** @global A glmatrix vector to use for transformations */
var transformVec = vec3.create();

// Initialize the vector....
vec3.set(transformVec,0.0,0.0,-2.0);

/** @global An object holding the geometry for a 3D terrain */
var myTerrain;


// View parameters
/** @global Location of the camera in world coordinates */
var eyePt = vec3.fromValues(0.0,0.0,0.0);
/** @global Direction of the view in world coordinates */
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
/** @global Up vector for view matrix creation, in world coordinates */
var up = vec3.fromValues(0.0,-1.0,0.0);
/** @global Location of a point along viewDir in world coordinates */
var viewPt = vec3.fromValues(0.0,0.0,0.0);

//Light parameters
/** @global Light position in VIEW coordinates */
var lightPosition = [18,4,4];
/** @global Ambient light color/intensity for Phong reflection */
var lAmbient = [0,0,0];
/** @global Diffuse light color/intensity for Phong reflection */
var lDiffuse = [1,1,5];
/** @global Specular light color/intensity for Phong reflection */
var lSpecular =[0,0,0];

//Material parameters
/** @global Ambient material color/intensity for Phong reflection */
var kAmbient = [1.0,1.0,1.0];
/** @global Diffuse material color/intensity for Phong reflection */
var kTerrainDiffuse = [205.0/255.0,163.0/255.0,63.0/255.0];
/** @global Specular material color/intensity for Phong reflection */
var kSpecular = [0.0,0.0,0.0];
/** @global Shininess exponent for Phong reflection */
var shininess = 23;
/** @global Edge color fpr wireframeish rendering */
var kEdgeBlack = [0.0,0.0,0.0];
/** @global Edge color for wireframe rendering */
var kEdgeWhite = [1.0,1.0,1.0];
var colors =[];
//variables for implementing quarternion rotation and pitch





//-------------------------------------------------------------------------
/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform,
                      false, pMatrix);
}

//-------------------------------------------------------------------------
/**
 * Generates and sends the normal matrix to the shader
 */
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//----------------------------------------------------------------------------------
/**
 * Pushes matrix onto modelview matrix stack
 */
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


//----------------------------------------------------------------------------------
/**
 * Pops matrix off of modelview matrix stack
 */
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//----------------------------------------------------------------------------------
/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

//----------------------------------------------------------------------------------
/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

//----------------------------------------------------------------------------------
/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);

  // If we don't find an element with the specified id
  // we do an early exit
  if (!shaderScript) {
    return null;
  }

  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }

  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }

  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

//----------------------------------------------------------------------------------
/**
 * Setup the fragment and vertex shaders
 */
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
  shaderProgram.uniformShininessLoc = gl.getUniformLocation(shaderProgram, "uShininess");
  shaderProgram.uniformAmbientMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKAmbient");
  shaderProgram.uniformDiffuseMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKDiffuse");
  shaderProgram.uniformSpecularMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKSpecular");
}

//-------------------------------------------------------------------------
/**
 * Sends material information to the shader
 * @param {Float32} alpha shininess coefficient
 * @param {Float32Array} a Ambient material color
 * @param {Float32Array} d Diffuse material color
 * @param {Float32Array} s Specular material color
 */
function setMaterialUniforms(alpha,a,d,s) {

  gl.uniform1f(shaderProgram.uniformShininessLoc, alpha);
  gl.uniform3fv(shaderProgram.uniformAmbientMaterialColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularMaterialColorLoc, s);
}

//-------------------------------------------------------------------------
/**
 * Sends light information to the shader
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength
 */
function setLightUniforms(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//----------------------------------------------------------------------------------
/**
 * Populate buffers with data
 */
function setupBuffers() {
    myTerrain = new Terrain(64,-0.5,0.5,-0.5,0.5);
    myTerrain.loadBuffers();
    vertexColorBuffer = gl.createBuffer();
    /*create color buffer for varies colro displaying based on height*/
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
    for(var i=0;i<=64;i++){
      for(var j=0;j<=64;j++){
        //base on different height assign different color//
        if(myTerrain.diamond[i][j]>15){
          this.colors.push(0);
          this.colors.push(0.9*myTerrain.diamond[i][j]);
          this.colors.push(0.06*myTerrain.diamond[i][j]);
        }
        else if(myTerrain.diamond[i][j]<5){
          this.colors.push(0);
          this.colors.push(0.33*myTerrain.diamond[i][j]);
          this.colors.push(0);
        }
        else{
        this.colors.push(0.06*myTerrain.diamond[i][j]);
        this.colors.push(1);
        this.colors.push(1);
      }
      }
    }

    console.log("Loaded ", this.colors.length, " colors");
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    vertexColorBuffer.itemSize = 3;
    vertexColorBuffer.numItems = this.colors.length;
}

//----------------------------------------------------------------------------------/
/**
 *
*/
var viewDirAfter = vec3.fromValues(0.0,0.0,-1.0);
var speedCo = 0.001;
function forward(){
    //use viewdirafter to make sure plane's fly directiion is updated

    eyePt[0] = eyePt[0]+viewDirAfter[0]*speedCo;
    eyePt[1] = eyePt[1]+viewDirAfter[1]*speedCo;
    eyePt[2] = eyePt[2]+viewDirAfter[2]*speedCo;
}


var viewRotateQ = quat.create();
var rollAngle = 0;
var pQ = quat.create();

var RolledUp = quat.create();
var conj =quat.create();
var RolledUpView =quat.create();
var rotateAround =quat.create();
var upAfter =vec3.fromValues(0.0,1.0,0.0);

function rotation(){
  //implementing p'=qpq^-1
  //calculating q part
  //the axis we're rotating about would be viewing direction
  rotateAround [0] = viewDir[0]*Math.sin(rollAngle/2);
  rotateAround [1] = viewDir[1]*Math.sin(rollAngle/2);
  rotateAround [2] = viewDir[2]*Math.sin(rollAngle/2);
  rotateAround [3] = Math.cos(rollAngle/2);

  //get p, update the initial up axis
  pQ= quat.fromValues(up[0],up[1],up[2],0);
  //qp
  var qp = quat.create();
  qp= quat.multiply(qp, rotateAround, pQ);

  //get q^-1
  conj = quat.conjugate(conj, rotateAround);
  RolledUp= quat.conjugate(RolledUp, qp, conj);
}


//implement the pitch operation
var pitch = quat.create();
var pitchA = 0;
var viewDQ =quat.create();
var conj2 =quat.create();


function doPitch(){
  //looking up and down will be like rotating around an axis perpendicullar
  //to both view direction and up direction
  var upaxis = vec3.cross(vec3.create(), viewDir, upAfter);

  pitch[0] = upaxis[0]*Math.sin(pitchA/2);
  pitch[1] = upaxis[1]*Math.sin(pitchA/2);
  pitch[2] = upaxis[2]*Math.sin(pitchA/2);
  pitch[3] = Math.cos(pitchA/2);
  //get p, update the up axis after rotatoin update
  var pQ= quat.fromValues(upAfter[0],upAfter[1],upAfter[2],0);
  var viewDQ = quat.fromValues(viewDir[0],viewDir[1], viewDir[2],0);
  newUpQuat = quat.multiply(RolledUp,pitch,pQ);
  RolledUpView = quat.multiply(RolledUpView,pitch,viewDQ);

  conj2 = quat.conjugate(conj2, pitch);
  RolledUp = quat.multiply(RolledUp,newUpQuat,conj2);
  RolledUpView = quat.multiply(RolledUpView, RolledUpView, conj2);
}


var toright = false;
var toleft = false;
var todown = false;
var toup = false;
var speedup=false;
var speeddown=false;
function keyDownHandler(event) {
    if(event.keyCode == 39) {
        toright = true;
    }
    else if(event.keyCode == 37) {
        toleft = true;
    }
    if(event.keyCode == 40) {
    	 todown = true;
    }
    else if(event.keyCode == 38) {
    	toup = true;
    }
    if(event.keyCode == 187) {
    	 speedup=true;
    }
    else if(event.keyCode == 189){
       speeddown=true;
    }
}

function keyUpHandler(event) {
    if(event.keyCode == 39) {
        toright = false;
    }
    else if(event.keyCode == 37) {
        toleft = false;
    }
    if(event.keyCode == 40) {
    	todown = false;
    }
    else if(event.keyCode == 38) {
    	toup = false;
    }
    if(event.keyCode == 187) {
       speedup=false;
    }
    else if(event.keyCode == 189){
       speeddown=false;
    }
}

 function handlekeys(){

    if(toright){
      rollAngle+= 0.003;
    }
    //turn left
    else if(toleft){
      rollAngle-= 0.003;
    }
    //turn up
    if(toup){
      pitchA+=0.002;
    }
    //turn down
    else if (todown) {
      pitchA-=0.002;
    }
    if(speedup){
      speedCo+=0.0005;
    }
    else if(speeddown){
      speedCo-=0.0005
    }
}

//----------------------------------------------------------------------------------
/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() {

     forward();

     rotation();

     upAfter = vec3.fromValues(RolledUp[0],RolledUp[1],RolledUp[2]);

     doPitch();

    upAfter = vec3.fromValues(RolledUp[0],RolledUp[1],RolledUp[2]);
    viewDirAfter = vec3.fromValues(RolledUpView[0],RolledUpView[1],RolledUpView[2]);



    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective
    mat4.perspective(pMatrix,degToRad(45),
                     gl.viewportWidth / gl.viewportHeight,
                     0.1, 200.0);

    // We want to look down -z, so create a lookat point in that direction
    vec3.add(viewPt,eyePt,viewDirAfter);
    // Then generate the lookat matrix and initialize the MV matrix to that view
    mat4.lookAt(mvMatrix,eyePt,viewPt,upAfter);

    //Draw Terrain
    mvPushMatrix();
    vec3.set(transformVec,0.0,-0.25,-2.0);
    mat4.translate(mvMatrix, mvMatrix,transformVec);
    mat4.rotateY(mvMatrix, mvMatrix, degToRad(viewRot));
    mat4.rotateX(mvMatrix, mvMatrix, degToRad(-90));
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexColorAttribute,
                              vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
    setMatrixUniforms();
    setLightUniforms(lightPosition,lAmbient,lDiffuse,lSpecular);

    if ((document.getElementById("polygon").checked) || (document.getElementById("wirepoly").checked))
    {
      setMaterialUniforms(shininess,kAmbient,kTerrainDiffuse,kSpecular);
      myTerrain.drawTriangles();
    }

    if(document.getElementById("wirepoly").checked)
    {
      setMaterialUniforms(shininess,kAmbient,kEdgeBlack,kSpecular);
      myTerrain.drawEdges();
    }

    if(document.getElementById("wireframe").checked)
    {
      setMaterialUniforms(shininess,kAmbient,kEdgeWhite,kSpecular);
      myTerrain.drawEdges();
    }
    mvPopMatrix();


}

//----------------------------------------------------------------------------------
/**
 * Startup function called from html code to start program.
 */
 function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders();
  setupBuffers();
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  document.addEventListener('keydown', keyDownHandler, false);
  document.addEventListener('keyup', keyUpHandler, false);
  tick();
}

//----------------------------------------------------------------------------------
/**
 * Keeping drawing frames....
 */
function tick() {
    requestAnimFrame(tick);
    handlekeys();
    draw();
}
