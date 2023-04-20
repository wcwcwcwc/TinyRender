import { BufferAttribute } from '../data/BufferAttribute'

export class VertexBuffer {
  length: number
  attributeLocation: number
  itemSize: number
  dynamicDraw: boolean
  gl: WebGLRenderingContext | WebGL2RenderingContext
  buffer: WebGLBuffer | null
  bufferAttribute: BufferAttribute
  public array: any

  constructor(
    gl: WebGLRenderingContext,
    bufferAttribute: BufferAttribute,
    attributeLocation: number,
    dynamicDraw: boolean
  ) {
    this.attributeLocation = attributeLocation
    this.bufferAttribute = bufferAttribute
    this.array = this.bufferAttribute.array
    this.itemSize = this.bufferAttribute.itemSize

    this.dynamicDraw = dynamicDraw

    this.gl = gl
    this.buffer = gl.createBuffer()
    this.bind()
    gl.bufferData(
      gl.ARRAY_BUFFER,
      this.array,
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
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, array.array)
  }
  enableAttributes() {
    const { gl } = this
    gl.enableVertexAttribArray(this.attributeLocation)
  }
  setVertexAttribPointers() {
    const { gl } = this
    let type = gl.FLOAT
    if (this.array instanceof Float32Array) {
      type = gl.FLOAT
    } else if (this.array instanceof Uint16Array) {
      type = gl.UNSIGNED_SHORT
    }
    let size = this.itemSize
    const { normalized, stride, offset } = this.bufferAttribute
    if (this.attributeLocation !== undefined) {
      gl.vertexAttribPointer(
        this.attributeLocation,
        size,
        type,
        normalized,
        stride,
        offset
      )
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
  bytesPerElement: any
  count: number
  constructor(
    gl: any,
    bufferAttribute: BufferAttribute,
    dynamicDraw?: boolean
  ) {
    this.gl = gl
    this.buffer = gl.createBuffer()
    this.dynamicDraw = Boolean(dynamicDraw)
    this.bytesPerElement = bufferAttribute.array.BYTES_PER_ELEMENT
    this.count = bufferAttribute.count

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffer)
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      bufferAttribute.array,
      this.dynamicDraw ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW
    )
  }
  bind() {
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffer)
  }
  updateData(bufferAttribute: BufferAttribute) {
    const gl = this.gl
    //this.context.unbindVAO();
    this.bind()
    gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, bufferAttribute.array)
  }
}

export class VertexArrayObject {
  public gl: any
  public vao: any
  public program: any

  constructor(gl: any) {
    this.gl = gl
    this.vao = gl.createVertexArray()
    this.gl.bindVertexArray(this.vao)
  }
  bind() {
    this.gl.bindVertexArray(this.vao)
  }
  unbind() {
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null)
    this.gl.bindVertexArray(null)
  }
  // VBO组合VAO
  // render之前创建vbo，完成缓冲区创建及数据绑定
  // render时完成VAO
  packUp(VertexBufferArray: VertexBuffer[], indexBuffer: any) {
    this.bind()
    for (let index = 0; index < VertexBufferArray.length; index++) {
      const vertexBuffer = VertexBufferArray[index]
      vertexBuffer.enableAttributes()
      vertexBuffer.bind()
      vertexBuffer.setVertexAttribPointers()
    }
    indexBuffer.bind()
    this.unbind()
  }
}
