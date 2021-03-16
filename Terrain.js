/**
 * @fileoverview Terrain - A simple 3D terrain using WebGL
 * @author Eric Shaffer
 */

/** Class implementing 3D terrain. */
class Terrain{
/**
 * Initialize members of a Terrain object
 * @param {number} div Number of triangles along x axis and y axis
 * @param {number} minX Minimum X coordinate value
 * @param {number} maxX Maximum X coordinate value
 * @param {number} minY Minimum Y coordinate value
 * @param {number} maxY Maximum Y coordinate value
 */
    constructor(div,minX,maxX,minY,maxY){
        this.div = div;
        this.minX=minX;
        this.minY=minY;
        this.maxX=maxX;
        this.maxY=maxY;
        this.randomNum=0;
        // Allocate vertex array
        this.vBuffer = [];
        // Allocate triangle array
        this.fBuffer = [];
        // Allocate normal array
        this.nBuffer = [];
        // Allocate array for edges so we can draw wireframe
        this.eBuffer = [];
        console.log("Terrain: Allocated buffers");
        this.diamond =[];
        this.generateTriangles();
        console.log("Terrain: Generated triangles");

        this.generateLines();
        console.log("Terrain: Generated lines");

        // Get extension for 4 byte integer indices for drwElements
        var ext = gl.getExtension('OES_element_index_uint');
        if (ext ==null){
            alert("OES_element_index_uint is unsupported by your browser and terrain generation cannot proceed.");
        }
    }

    /**
    * Set the x,y,z coords of a vertex at location(i,j)
    * @param {Object} v an an array of length 3 holding x,y,z coordinates
    * @param {number} i the ith row of vertices
    * @param {number} j the jth column of vertices
    */
    setVertex(v,i,j)
    {
        //Your code here
        var vid = 3*(i*(this.div+1) + j);
        this.vbuffer[vid] = v[0];
        this.vbuffer[vid+1] = v[1];
        this.vbuffer[vid+2] = v[2];
    }

    /**
    * Return the x,y,z coordinates of a vertex at location (i,j)
    * @param {Object} v an an array of length 3 holding x,y,z coordinates
    * @param {number} i the ith row of vertices
    * @param {number} j the jth column of vertices
    */
    getVertex(v,i,j)
    {
        //Your code here
        var vid = 3*(i*(this.div+1) + j);
        v[0] = this.vbuffer[vid];
        v[1] = this.vbuffer[vid+1];
        v[2] = this.vbuffer[vid+2];
    }

    /**
    * Send the buffer objects to WebGL for rendering
    */
    loadBuffers()
    {
        // Specify the vertex coordinates
        this.VertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vBuffer), gl.STATIC_DRAW);
        this.VertexPositionBuffer.itemSize = 3;
        this.VertexPositionBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.VertexPositionBuffer.numItems, " vertices");

        // Specify normals to be able to do lighting calculations
        this.VertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.nBuffer),
                  gl.STATIC_DRAW);
        this.VertexNormalBuffer.itemSize = 3;
        this.VertexNormalBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.VertexNormalBuffer.numItems, " normals");

        // Specify faces of the terrain
        this.IndexTriBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexTriBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.fBuffer),
                  gl.STATIC_DRAW);
        this.IndexTriBuffer.itemSize = 1;
        this.IndexTriBuffer.numItems = this.fBuffer.length;
        console.log("Loaded ", this.numFaces, " triangles");
        console.log("Loaded ", this.diamond.numItems, " normals");

        //Setup Edges
        this.IndexEdgeBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexEdgeBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.eBuffer),
                  gl.STATIC_DRAW);
        this.IndexEdgeBuffer.itemSize = 1;
        this.IndexEdgeBuffer.numItems = this.eBuffer.length;

        console.log("triangulatedPlane: loadBuffers");
    }

    /**
    * Render the triangles
    */
    drawTriangles(){
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionBuffer.itemSize,
                         gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute,
                           this.VertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);

        //Draw
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexTriBuffer);
        gl.drawElements(gl.TRIANGLES, this.IndexTriBuffer.numItems, gl.UNSIGNED_INT,0);
    }

    /**
    * Render the triangle edges wireframe style
    */
    drawEdges(){

        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionBuffer.itemSize,
                         gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute,
                           this.VertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);

        //Draw
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexEdgeBuffer);
        gl.drawElements(gl.LINES, this.IndexEdgeBuffer.numItems, gl.UNSIGNED_INT,0);
    }
/**
 * Fill the vertex and buffer arrays
 */

generateTriangles()
{
    /** initialize  height map*/
        for(var i = 0; i<=this.div; i++){
        this.diamond[i] = new Array();
        for(var j = 0; j<=this.div; j++){
          this.diamond[i][j] = 0;
        }
      }

    this.diamondSquare( 0, 0, 0, this.div, this.div, this.div, this.div, this.div,this.div);


    var x_amount = (this.maxX - this.minX) / this.div
    var y_amount = (this.maxY - this.minY) / this.div

    for (var i = 0; i <= this.div; i++) {
        for (var j = 0; j <= this.div; j++) {
            this.vBuffer.push(j*x_amount + this.minX)
            this.vBuffer.push(this.minY + i*y_amount)
            this.vBuffer.push(this.diamond[i][j]*0.006)

            //console.log(this.diamond[i][j]);

            this.nBuffer.push(0)
            this.nBuffer.push(0)
            this.nBuffer.push(1)
        }
    }

    this.normals(this.diamond,this.nBuffer,this.div, this.x_amount,this.y_amount);//fill in the normals

    for (var i = 0; i < this.div; i++) {
        for (var j = 0; j < this.div; j++) {

            var vid = i*(this.div+1) + j

            this.fBuffer.push(vid)
            this.fBuffer.push(vid + this.div+1)
            this.fBuffer.push(vid + this.div+2)

            this.fBuffer.push(vid)
            this.fBuffer.push(vid+1)
            this.fBuffer.push(vid + this.div+2)
        }
    }

    this.numVertices = this.vBuffer.length/3;
    this.numFaces = this.fBuffer.length/3;
}




diamondSquare(x1, y1, x2, y2, x3, y3, x4, y4,div)
 {
   var rough=div;
   /*stop when points next to each other*/
   if((x3 - x1) == 1){
     return;
   }
   /*initialize*/
   if(rough == 64)
   {
     this.diamond[x1][y1] = 0;
     this.diamond[x2][y2] = 0;
     this.diamond[x3][y3] = 0;
     this.diamond[x4][y4] = 0;
     rough=rough/10;
}
   //* find the center of dimound*/
   var centerX = (x4 - x1) /2 + x1;
   var centerY = (y2 - y1) /2 + y1;
   var randomNum = Math.random()*rough;
   this.diamond[centerX][centerY] =randomNum+rough+this.diamond[x1][y1]+this.diamond[x2][y2]+this.diamond[x3][y3]+this.diamond[x4][y4];
   /*fill in the four midpoints*/
   //feed int he previous this.dimoun value to avoid too steep sloop in graph
   this.diamond[centerX][y2] = this.diamond[x2][y2]+this.diamond[x2][y2]+this.diamond[centerX][centerY]+0.1*randomNum;
   this.diamond[centerX][y1] = this.diamond[x1][y1]+this.diamond[x2][y2]+this.diamond[centerX][centerY]+0.1*randomNum;
   this.diamond[x1][centerY] = this.diamond[x1][y1]+this.diamond[x2][y2]+this.diamond[centerX][centerY]+0.1*randomNum;
   this.diamond[x4][centerY] = this.diamond[x4][y4]+this.diamond[x2][y2]+this.diamond[centerX][centerY]+0.1*randomNum;

   rough=rough*0.9
     /*recursion*/
   this.diamondSquare(x1, y1, x1, centerY, centerX, centerY, centerX, y4, this.div);//bottom left square
   this.diamondSquare(x1, centerY, x2, y2, centerX, y3, centerX, centerY, this.div);//top left
   this.diamondSquare(centerX, centerY, centerX, y2, x3, y3, x4, centerY, this.div);//bottom  right
   this.diamondSquare(centerX, y1, centerX, centerY, x3, centerY, x4, y4, this.div);//top right
 }


normals(diamond, nBuffer, div, lengthX, lengthY ){
  var v1  =  vec3.create();
  var v2  =  vec3.create();
  var v3 = vec3.create();
  var v4 = vec3.create();
  var crossp = vec3.create();
  var crossp3 = vec3.create();


  for(var i=0;i<this.div;i++){
    for (var j=0;j<this.div;j++){
      var vid = i*(this.div+1)+j;
      /*compute vector distance*/
      /*set the cordinate for each vector*/
      vec3.set(v1,lengthX,0,diamond[i+1][j]-diamond[i][j])//first coordinate
      vec3.set(v2,lengthX,lengthY,diamond[i+1][j+1]-diamond[i][j])
      vec3.cross(crossp,v1,v2)//calculate crossp product of two vectors

      //*second triangle of a squre**//
      vec3.set(v1,0,-lengthY,diamond[i][j+1]-diamond[i+1][j+1])//first coordinate
      vec3.set(v2,-lengthX,-lengthY,diamond[i][j]-diamond[i+1][j+1])
      vec3.cross(crossp3,v1,v2)//calculate crossp product of two vectors

      nBuffer[3*vid]=crossp[0];
      nBuffer[(3*vid)+1]=crossp[1];
      nBuffer[(3*vid)+2]=crossp[2];

      nBuffer[3*(vid+this.div+1)]=crossp[0]+crossp3[0];
      nBuffer[3*(vid+this.div+1)+1]=crossp[1]+crossp3[1];
      nBuffer[3*(vid+this.div+1)+2]=crossp[2]+crossp3[2];

      nBuffer[3*(vid+1)]=crossp[0]+crossp3[0];
      nBuffer[3*(vid+1)+1]=crossp[1]+crossp3[1];
      nBuffer[3*(vid+1)+2]=crossp[2]+crossp3[2];

      nBuffer[3*(vid+this.div+2)]=crossp[0];
      nBuffer[3*(vid+this.div+2)+1]=crossp[1];
      nBuffer[3*(vid+this.div+2)+2]=crossp[2];
    }
    //normalize  the length
    var length  = 0;
    for(var i=0;i<=this.div;i++)
     for(var j=0;j<=this.div;j++)
     {
      var vid = i*(this.div+1) + j;
      length = Math.sqrt(Math.pow(nBuffer[3*vid],2) + Math.pow(nBuffer[3*vid + 1],2) + Math.pow(nBuffer[3*vid + 2],2));
      nBuffer[3*vid] = nBuffer[3*vid] / length;
      nBuffer[3*vid + 1] = nBuffer[3*vid + 1] / length;
      nBuffer[3*vid + 2] = nBuffer[3*vid + 2] / length;
    }
  }

}
/**
 * Print vertices and triangles to console for debugging
 */


printBuffers()
    {

    for(var i=0;i<this.numVertices;i++)
          {
           console.log("v ", this.vBuffer[i*3], " ",
                             this.vBuffer[i*3 + 1], " ",
                             this.vBuffer[i*3 + 2], " ");

          }

      for(var i=0;i<this.numFaces;i++)
          {
           console.log("f ", this.fBuffer[i*3], " ",
                             this.fBuffer[i*3 + 1], " ",
                             this.fBuffer[i*3 + 2], " ");

          }

    }

/**
 * Generates line values from faces in faceArray
 * to enable wireframe rendering
 */
generateLines()
{
    var numTris=this.fBuffer.length/3;
    for(var f=0;f<numTris;f++)
    {
        var fid=f*3;
        this.eBuffer.push(this.fBuffer[fid]);
        this.eBuffer.push(this.fBuffer[fid+1]);

        this.eBuffer.push(this.fBuffer[fid+1]);
        this.eBuffer.push(this.fBuffer[fid+2]);

        this.eBuffer.push(this.fBuffer[fid+2]);
        this.eBuffer.push(this.fBuffer[fid]);
    }

}

}
