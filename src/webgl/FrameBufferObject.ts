// 帧缓冲类

interface FrameBufferObjectOptions {
  gl: any
  width: number
  height: number
}
export default class FrameBufferObject {
  gl: any
  width: number
  height: number
  colorTexture: any
  depthTexture: any
  fbo: WebGLFramebuffer
  constructor(options: FrameBufferObjectOptions) {
    const { gl, width, height } = options
    this.gl = gl
    this.width = width
    this.height = height
    this.fbo = gl.createFramebuffer()
    this.setCurrentFrameBufferObject()
    this.setColorTexture()
    this.setDepthColorTexture()
    this.setNullFrameBufferObject()
  }
  setCurrentFrameBufferObject() {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbo)
  }
  setNullFrameBufferObject() {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)
  }
  setColorTexture() {
    let gl = this.gl
    this.colorTexture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, this.colorTexture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      this.width,
      this.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    )
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.colorTexture,
      0
    )
  }
  setDepthColorTexture() {
    let gl = this.gl
    this.depthTexture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, this.depthTexture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.DEPTH_COMPONENT16,
      this.width,
      this.height,
      0,
      gl.DEPTH_COMPONENT,
      gl.FLOAT,
      null
    )
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT,
      gl.TEXTURE_2D,
      this.depthTexture,
      0
    )
  }
}
