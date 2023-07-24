// HDR转换到cubemap，参考babylon解析
import { Vector3 } from '../math/Vector3'

type Nullable<T> = T | null
/**
 * CubeMap information grouping all the data for each faces as well as the cubemap size.
 */
export interface CubeMapInfo {
  /**
   * The pixel array for the front face.
   * This is stored in format, left to right, up to down format.
   */
  front: Nullable<ArrayBufferView>

  /**
   * The pixel array for the back face.
   * This is stored in format, left to right, up to down format.
   */
  back: Nullable<ArrayBufferView>

  /**
   * The pixel array for the left face.
   * This is stored in format, left to right, up to down format.
   */
  left: Nullable<ArrayBufferView>

  /**
   * The pixel array for the right face.
   * This is stored in format, left to right, up to down format.
   */
  right: Nullable<ArrayBufferView>

  /**
   * The pixel array for the up face.
   * This is stored in format, left to right, up to down format.
   */
  up: Nullable<ArrayBufferView>

  /**
   * The pixel array for the down face.
   * This is stored in format, left to right, up to down format.
   */
  down: Nullable<ArrayBufferView>

  /**
   * The size of the cubemap stored.
   *
   * Each faces will be size * size pixels.
   */
  size: number

  /**
   * The format of the texture.
   *
   * RGBA, RGB.
   */
  format: string | number

  /**
   * The type of the texture data.
   *
   * UNSIGNED_INT, FLOAT.
   */
  type: string | number

  /**
   * Specifies whether the texture is in gamma space.
   */
  gammaSpace: boolean
}

/**
 * Helper class useful to convert panorama picture to their cubemap representation in 6 faces.
 */
export class PanoramaToCubeMapTools {
  private static FACE_LEFT = [
    new Vector3(-1.0, -1.0, -1.0),
    new Vector3(1.0, -1.0, -1.0),
    new Vector3(-1.0, 1.0, -1.0),
    new Vector3(1.0, 1.0, -1.0)
  ]
  private static FACE_RIGHT = [
    new Vector3(1.0, -1.0, 1.0),
    new Vector3(-1.0, -1.0, 1.0),
    new Vector3(1.0, 1.0, 1.0),
    new Vector3(-1.0, 1.0, 1.0)
  ]
  private static FACE_FRONT = [
    new Vector3(1.0, -1.0, -1.0),
    new Vector3(1.0, -1.0, 1.0),
    new Vector3(1.0, 1.0, -1.0),
    new Vector3(1.0, 1.0, 1.0)
  ]
  private static FACE_BACK = [
    new Vector3(-1.0, -1.0, 1.0),
    new Vector3(-1.0, -1.0, -1.0),
    new Vector3(-1.0, 1.0, 1.0),
    new Vector3(-1.0, 1.0, -1.0)
  ]
  private static FACE_DOWN = [
    new Vector3(1.0, 1.0, -1.0),
    new Vector3(1.0, 1.0, 1.0),
    new Vector3(-1.0, 1.0, -1.0),
    new Vector3(-1.0, 1.0, 1.0)
  ]
  private static FACE_UP = [
    new Vector3(-1.0, -1.0, -1.0),
    new Vector3(-1.0, -1.0, 1.0),
    new Vector3(1.0, -1.0, -1.0),
    new Vector3(1.0, -1.0, 1.0)
  ]

  /**
   * Converts a panorama stored in RGB right to left up to down format into a cubemap (6 faces).
   *
   * @param float32Array The source data.
   * @param inputWidth The width of the input panorama.
   * @param inputHeight The height of the input panorama.
   * @param size The willing size of the generated cubemap (each faces will be size * size pixels)
   * @return The cubemap data
   */
  public static ConvertPanoramaToCubemap(
    float32Array: Float32Array,
    inputWidth: number,
    inputHeight: number,
    size: number
  ): CubeMapInfo {
    if (!float32Array) {
      throw 'ConvertPanoramaToCubemap: input cannot be null'
    }

    if (float32Array.length != inputWidth * inputHeight * 3) {
      throw 'ConvertPanoramaToCubemap: input size is wrong'
    }

    const textureFront = this.CreateCubemapTexture(
      size,
      this.FACE_FRONT,
      float32Array,
      inputWidth,
      inputHeight
    )
    const textureBack = this.CreateCubemapTexture(
      size,
      this.FACE_BACK,
      float32Array,
      inputWidth,
      inputHeight
    )
    const textureLeft = this.CreateCubemapTexture(
      size,
      this.FACE_LEFT,
      float32Array,
      inputWidth,
      inputHeight
    )
    const textureRight = this.CreateCubemapTexture(
      size,
      this.FACE_RIGHT,
      float32Array,
      inputWidth,
      inputHeight
    )
    const textureUp = this.CreateCubemapTexture(
      size,
      this.FACE_UP,
      float32Array,
      inputWidth,
      inputHeight
    )
    const textureDown = this.CreateCubemapTexture(
      size,
      this.FACE_DOWN,
      float32Array,
      inputWidth,
      inputHeight
    )

    return {
      front: textureFront,
      back: textureBack,
      left: textureLeft,
      right: textureRight,
      up: textureUp,
      down: textureDown,
      size: size,
      type: 'TEXTURETYPE_FLOAT',
      format: 'TEXTUREFORMAT_RGB',
      gammaSpace: false
    }
  }

  private static CreateCubemapTexture(
    texSize: number,
    faceData: Vector3[],
    float32Array: Float32Array,
    inputWidth: number,
    inputHeight: number
  ) {
    const buffer = new ArrayBuffer(texSize * texSize * 4 * 3)
    const textureArray = new Float32Array(buffer)

    let rotDX1 = new Vector3(faceData[1].x, faceData[1].y, faceData[1].z)
    rotDX1.sub(faceData[0], undefined).multiplyScalar(1 / texSize)
    let rotDX2 = new Vector3(faceData[3].x, faceData[3].y, faceData[3].z)
    rotDX2.sub(faceData[2], undefined).multiplyScalar(1 / texSize)

    const dy = 1 / texSize
    let fy = 0

    for (let y = 0; y < texSize; y++) {
      let xv1 = faceData[0]
      let xv2 = faceData[2]

      for (let x = 0; x < texSize; x++) {
        let v = new Vector3(xv2.x, xv2.y, xv2.z)
        v.sub(xv1, undefined)
          .multiplyScalar(fy)
          .add(xv1, undefined)
        v.normalize()

        const color = this.CalcProjectionSpherical(
          v,
          float32Array,
          inputWidth,
          inputHeight
        )

        // 3 channels per pixels
        textureArray[y * texSize * 3 + x * 3 + 0] = color.r
        textureArray[y * texSize * 3 + x * 3 + 1] = color.g
        textureArray[y * texSize * 3 + x * 3 + 2] = color.b

        xv1 = new Vector3(xv1.x + rotDX1.x, xv1.y + rotDX1.y, xv1.z + rotDX1.z)
        xv2 = new Vector3(xv2.x + rotDX2.x, xv2.y + rotDX2.y, xv2.z + rotDX2.z)
      }

      fy += dy
    }

    return textureArray
  }

  private static CalcProjectionSpherical(
    vDir: Vector3,
    float32Array: Float32Array,
    inputWidth: number,
    inputHeight: number
  ): any {
    let theta = Math.atan2(vDir.z, vDir.x)
    const phi = Math.acos(vDir.y)

    while (theta < -Math.PI) {
      theta += 2 * Math.PI
    }
    while (theta > Math.PI) {
      theta -= 2 * Math.PI
    }

    let dx = theta / Math.PI
    const dy = phi / Math.PI

    // recenter.
    dx = dx * 0.5 + 0.5

    let px = Math.round(dx * inputWidth)
    if (px < 0) {
      px = 0
    } else if (px >= inputWidth) {
      px = inputWidth - 1
    }

    let py = Math.round(dy * inputHeight)
    if (py < 0) {
      py = 0
    } else if (py >= inputHeight) {
      py = inputHeight - 1
    }

    const inputY = inputHeight - py - 1
    const r = float32Array[inputY * inputWidth * 3 + px * 3 + 0]
    const g = float32Array[inputY * inputWidth * 3 + px * 3 + 1]
    const b = float32Array[inputY * inputWidth * 3 + px * 3 + 2]

    return {
      r: r,
      g: g,
      b: b
    }
  }
}
