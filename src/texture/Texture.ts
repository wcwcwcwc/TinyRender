import Engine from '../engine/Engine'
import { loadImage } from '../misc/Ajax'

type Nullable<T> = T | null

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
  noMipmap: boolean
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
  public noMipmap: boolean
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
    this.noMipmap = true
    //  this.createTexture()
    // this.loadTexture()
  }
  createTexture() {
    this.webglTexture = this.gl.createTexture()
  }
  updateTexture() {
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
    gl.bindTexture(target, this.webglTexture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, magFilter)
    gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, minFilter)
    gl.texParameteri(target, gl.TEXTURE_WRAP_S, wrapS)
    gl.texParameteri(target, gl.TEXTURE_WRAP_T, wrapT)
    // gl.texImage2D(
    //   target,
    //   0,
    //   internalFormat,
    //   width,
    //   height,
    //   0,
    //   format,
    //   type,
    //   data
    // )
    gl.bindTexture(target, null)
  }
  loadTexture() {
    loadImage(this.url, this.update.bind(this), () => {}, '')
  }
  update(img: HTMLImageElement | ImageBitmap) {
    const {
      gl,
      target,
      magFilter,
      minFilter,
      wrapS,
      wrapT,
      internalFormat,
      format,
      type
    } = this

    let width = img.width || this.width
    let height = img.height || this.height
    gl.bindTexture(target, this.webglTexture)
    gl.texImage2D(
      target,
      0,
      internalFormat,
      width,
      height,
      0,
      format,
      type,
      img
    )
    gl.bindTexture(target, null)
    this.loaded = true
  }

  createCubeTexture() {
    this.createTexture()
    this.target = this.gl.TEXTURE_CUBE_MAP
    this.gl.bindTexture(this.target, this.webglTexture)
    if (!this.noMipmap) {
      this.minFilter = this.gl.LINEAR_MIPMAP_LINEAR
      this.magFilter = this.gl.LINEAR
    } else {
      this.minFilter = this.gl.LINEAR
      this.magFilter = this.gl.LINEAR
    }
    const { gl, target, magFilter, minFilter, wrapS, wrapT } = this
    gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, magFilter)
    gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, minFilter)
    gl.texParameteri(target, gl.TEXTURE_WRAP_S, wrapS)
    gl.texParameteri(target, gl.TEXTURE_WRAP_T, wrapT)
    gl.bindTexture(this.target, null)
  }

  updateCubeTexture(
    data: ArrayBufferView[],
    compression: Nullable<string> = null,
    level: number = 0
  ) {
    this.format = this.gl.RGBA32F
    this.internalFormat = this.gl.RGBA
    this.type = this.gl.FLOAT
    this.target = this.gl.TEXTURE_CUBE_MAP
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
    gl.bindTexture(target, this.webglTexture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    for (let faceIndex = 0; faceIndex < 6; faceIndex++) {
      let faceData = data[faceIndex]
      faceData = this.convertRGBtoRGBATextureData(faceData, width, height, type)

      gl.texImage2D(
        gl.TEXTURE_CUBE_MAP_POSITIVE_X + faceIndex,
        level,
        format,
        width,
        height,
        0,
        internalFormat,
        type,
        faceData
      )
    }

    gl.generateMipmap(gl.TEXTURE_CUBE_MAP)

    gl.bindTexture(target, null)
    this.loaded = true
  }

  convertRGBtoRGBATextureData(
    rgbData: any,
    width: number,
    height: number,
    textureType: number
  ): ArrayBufferView {
    const { gl } = this
    // Create new RGBA data container.
    let rgbaData: any
    let val1 = 1
    if (textureType === gl.FLOAT) {
      rgbaData = new Float32Array(width * height * 4)
    } else if (textureType === gl.HALF_FLOAT) {
      rgbaData = new Uint16Array(width * height * 4)
      val1 = 15360 // 15360 is the encoding of 1 in half float
    } else if (textureType === gl.UNSIGNED_INT) {
      rgbaData = new Uint32Array(width * height * 4)
    } else {
      rgbaData = new Uint8Array(width * height * 4)
    }

    // Convert each pixel.
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const index = (y * width + x) * 3
        const newIndex = (y * width + x) * 4

        // Map Old Value to new value.
        rgbaData[newIndex + 0] = rgbData[index + 0]
        rgbaData[newIndex + 1] = rgbData[index + 1]
        rgbaData[newIndex + 2] = rgbData[index + 2]

        // Add fully opaque alpha channel.
        rgbaData[newIndex + 3] = val1
      }
    }

    return rgbaData
  }
}
