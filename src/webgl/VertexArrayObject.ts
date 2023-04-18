export class VertexBuffer {
  length: number
  attributes: Array<any>
  itemSize: number
  dynamicDraw: boolean
  gl: WebGLRenderingContext | WebGL2RenderingContext
  buffer: WebGLBuffer | null

  constructor(
    gl: WebGLRenderingContext,
    array: any,
    attributes: Array<any>,
    dynamicDraw: boolean
  ) {
    this.length = array.length
    this.attributes = attributes
    this.itemSize = array.bytesPerElement
    this.dynamicDraw = dynamicDraw

    this.gl = gl
    this.buffer = gl.createBuffer()
    this.bind()
    gl.bufferData(
      gl.ARRAY_BUFFER,
      array.arrayBuffer,
      this.dynamicDraw ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW
    )
  }

  bind() {
    const { gl } = this
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
  }
  updateData(array: any) {
    const { gl } = this
    this.bind()
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, array.arrayBuffer)
  }
  enableAttributes(program: any) {
    const { gl } = this
    for (let j = 0; j < this.attributes.length; j++) {
      const member = this.attributes[j]
      const attribIndex: number | void = program.attributes[member.name]
      if (attribIndex !== undefined) {
        gl.enableVertexAttribArray(attribIndex)
      }
    }
  }
  setVertexAttribPointers(program: any) {
    const { gl } = this
    for (let j = 0; j < this.attributes.length; j++) {
      const member = this.attributes[j]
      const attribIndex: number | void = program.attributes[member.name]
      const { size, type, normalized, stride, offset } = member

      if (attribIndex !== undefined) {
        gl.vertexAttribPointer(
          attribIndex,
          size,
          type,
          normalized,
          stride,
          offset
        )
      }
    }
  }
  destroy() {
    const { gl } = this
    if (this.buffer) {
      gl.deleteBuffer(this.buffer)
      this.buffer = null
    }
  }
}

export class IndexBuffer {
  dynamicDraw: boolean
  gl: WebGLRenderingContext | WebGL2RenderingContext
  buffer: WebGLBuffer | null
  constructor(gl: any, array: any, dynamicDraw?: boolean) {
    this.gl = gl
    this.buffer = gl.createBuffer()
    this.dynamicDraw = Boolean(dynamicDraw)

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffer)
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      array.arrayBuffer,
      this.dynamicDraw ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW
    )
  }
  bind() {
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffer)
  }
  updateData(array: any) {
    const gl = this.gl
    //this.context.unbindVAO();
    this.bind()
    gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, array.arrayBuffer)
  }
}

export class VertexArrayObject {
  public gl: any
  public vao: any
  public program: any

  constructor(gl: any, program: any) {
    this.gl = gl
    this.program = program
    this.vao = gl.createVertexArray()
    this.gl.bindVertexArray(this.vao)
  }
  bind() {
    this.gl.bindVertexArray(this.vao)
  }
  // VBO组合VAO
  packUp(VertexBuffer: VertexBuffer, indexBuffer: any) {
    this.bind()
    VertexBuffer.enableAttributes(this.program)
    VertexBuffer.bind()
    VertexBuffer.setVertexAttribPointers(this.program)
    indexBuffer.bind()
  }
}
