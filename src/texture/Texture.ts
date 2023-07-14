import Engine from '../engine/Engine'

// 纹理参数选项
interface TextureParametersOptions {
  isSRGB: boolean
  target: number
  magFilter: number
  minFilter: number
  wrapS: number
  wrapT: number
  unpackFlipY: boolean
  width: number
  height: number
  internalFormat: number
  format: number
  type: number
}

/**
 * 纹理类
 * 纹理创建时就应该准备好数据，因此创建要完成的工作：发送请求、保存数据、绑定纹理数据，因此需要 `gl` 参数
 */
export default class Texture {
  public engine: Engine
  public url: string
  public loaded: boolean
  public gl: any
  public webglTexture: WebGLTexture
  public target: number
  public isSRGB: boolean
  public magFilter: number
  public minFilter: number
  public wrapS: number
  public wrapT: number
  public unpackFlipY: boolean
  public width: number
  public height: number
  public internalFormat: number
  public format: number
  public type: number
  constructor(
    engine: Engine,
    url: string,
    TextureParametersOptions?: TextureParametersOptions
  ) {
    this.engine = engine
    this.url = url
    this.loaded = false
    this.gl = this.engine._gl
    this.target =
      (TextureParametersOptions && TextureParametersOptions.target) ||
      this.gl.TEXTURE_2D
    this.isSRGB =
      (TextureParametersOptions && TextureParametersOptions.isSRGB) || false
    this.magFilter =
      (TextureParametersOptions && TextureParametersOptions.magFilter) ||
      this.gl.NEAREST
    this.minFilter =
      (TextureParametersOptions && TextureParametersOptions.minFilter) ||
      this.gl.NEAREST
    this.wrapS =
      (TextureParametersOptions && TextureParametersOptions.wrapS) ||
      this.gl.CLAMP_TO_EDGE
    this.wrapT =
      (TextureParametersOptions && TextureParametersOptions.wrapT) ||
      this.gl.CLAMP_TO_EDGE
    this.unpackFlipY =
      (TextureParametersOptions && TextureParametersOptions.unpackFlipY) ||
      false
    this.width =
      (TextureParametersOptions && TextureParametersOptions.width) || 256
    this.height =
      (TextureParametersOptions && TextureParametersOptions.height) || 256
    this.internalFormat =
      (TextureParametersOptions && TextureParametersOptions.internalFormat) ||
      this.gl.RGBA
    this.format =
      (TextureParametersOptions && TextureParametersOptions.format) ||
      this.gl.RGBA
    this.type =
      (TextureParametersOptions && TextureParametersOptions.type) ||
      this.gl.UNSIGNED_BYTE
    this.createTexture()
    this.loadTexture()
  }
  createTexture() {
    const {
      gl,
      target,
      magFilter,
      minFilter,
      wrapS,
      wrapT,
      internalFormat,
      format,
      type,
      width,
      height
    } = this
    this.webglTexture = this.gl.createTexture()
    gl.bindTexture(target, this.webglTexture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, magFilter)
    gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, minFilter)
    gl.texParameteri(target, gl.TEXTURE_WRAP_S, wrapS)
    gl.texParameteri(target, gl.TEXTURE_WRAP_T, wrapT)
    gl.texImage2D(
      target,
      0,
      internalFormat,
      width,
      height,
      0,
      format,
      type,
      null
    )
    gl.bindTexture(target, null)
  }
  loadTexture() {}
  update() {}
}
