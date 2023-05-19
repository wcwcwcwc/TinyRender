// 帧缓冲类

interface FrameBufferObjectOptions {
  gl: any
  width: number
  height: number
  depthTextureComparison: boolean
  layers: number
}
export default class FrameBufferObject {
  gl: any
  width: number
  height: number
  colorTexture: any
  depthTexture: any
  fbo: WebGLFramebuffer
  target: number
  layers: number
  constructor(options: FrameBufferObjectOptions) {
    const { gl, width, height, depthTextureComparison, layers } = options
    this.gl = gl
    this.width = width
    this.height = height
    this.target = layers > 0 ? gl.TEXTURE_2D_ARRAY : gl.TEXTURE_2D
    this.layers = layers
    this.fbo = gl.createFramebuffer()
    this.setCurrentFrameBufferObject()
    this.setColorTexture()
    // 开启纹理对比
    if (depthTextureComparison) {
      this.updateDepthTextureComparison()
    } else {
      this.setDepthColorTexture()
    }
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
    gl.bindTexture(this.target, this.colorTexture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.texParameteri(this.target, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(this.target, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(this.target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(this.target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    if (this.layers) {
      gl.texImage3D(
        this.target,
        0,
        gl.RGBA,
        this.width,
        this.height,
        this.layers,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null
      )
    } else {
      gl.texImage2D(
        this.target,
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
  }
  setDepthColorTexture() {
    let gl = this.gl
    this.depthTexture = gl.createTexture()
    gl.bindTexture(this.target, this.depthTexture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.texParameteri(this.target, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(this.target, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(this.target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(this.target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    if (this.layers) {
      gl.texImage3D(
        this.target,
        0,
        gl.DEPTH_COMPONENT24,
        this.width,
        this.height,
        this.layers,
        0,
        gl.DEPTH_COMPONENT,
        gl.UNSIGNED_INT,
        null
      )
    } else {
      gl.texImage2D(
        this.target,
        0,
        gl.DEPTH_COMPONENT24,
        this.width,
        this.height,
        0,
        gl.DEPTH_COMPONENT,
        gl.UNSIGNED_INT,
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
  updateDepthTextureComparison() {
    let gl = this.gl
    this.depthTexture = gl.createTexture()
    gl.bindTexture(this.target, this.depthTexture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.texParameteri(this.target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(this.target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(this.target, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(this.target, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(this.target, gl.TEXTURE_COMPARE_FUNC, gl.LESS)
    gl.texParameteri(
      this.target,
      gl.TEXTURE_COMPARE_MODE,
      gl.COMPARE_REF_TO_TEXTURE
    )
    if (this.layers) {
      gl.texImage3D(
        this.target,
        0,
        gl.DEPTH_COMPONENT24,
        this.width,
        this.height,
        this.layers,
        0,
        gl.DEPTH_COMPONENT,
        gl.UNSIGNED_INT,
        null
      )
    } else {
      gl.texImage2D(
        this.target,
        0,
        gl.DEPTH_COMPONENT24,
        this.width,
        this.height,
        0,
        gl.DEPTH_COMPONENT,
        gl.UNSIGNED_INT,
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
  // 初始化gl尺寸，清除缓冲区
  resize() {
    this.gl.viewport(0, 0, this.width, this.height)
    this.gl.clearColor(1, 1, 1, 1.0)
    this.gl.clear(this.gl.COLOR_BUFFER_BIT)
    this.gl.clear(this.gl.DEPTH_BUFFER_BIT)
    this.gl.clear(this.gl.STENCIL_BUFFER_BIT)
  }
}
