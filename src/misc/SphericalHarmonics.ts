/**
 * SH用以系数替代传统的漫反射贴图，减少存储量
 * 加载cubeMap时，用以从此环境贴图中计算球谐系数：L与A
 * 默认计算三阶的球谐，共9项
 * pbr着色器中，计算漫反射时，传入此9项系数。
 */
import { Color3 } from '../math/Color'
import { clamp } from '../math/Common'
import { Vector3 } from '../math/Vector3'
import { CubeMapInfo } from './PanoramaToCubemap'

enum Face {
  right = 'right',
  left = 'left',
  up = 'up',
  down = 'down',
  front = 'front',
  back = 'back'
}

const faces = ['right', 'left', 'up', 'down', 'front', 'back']
/**
 * 计算三阶球谐函数
 * 用以PBR的漫反射时，传输项（n*w）最后计算的球谐系数A在三阶之后近似于0，对漫反射贡献越来越小，故此到三阶即可
 */
export default class SphericalHarmonics {
  // level = 0, m = 0
  public l0m0: Vector3 = new Vector3()
  // level = 1, m = -1
  public l1m_1: Vector3 = new Vector3()
  // level = 1, m = 0
  public l1m0: Vector3 = new Vector3()
  // level = 1, m = 1
  public l1m1: Vector3 = new Vector3()
  // level = 2, m = -2
  public l2m_2: Vector3 = new Vector3()
  // level = 2, m = -1
  public l2m_1: Vector3 = new Vector3()
  // level = 2, m = 0
  public l2m0: Vector3 = new Vector3()
  // level = 2, m = 1
  public l2m1: Vector3 = new Vector3()
  // level = 20, m = 2
  public l2m2: Vector3 = new Vector3()

  // 球谐三阶9个基函数的常数项
  private static readonly SH3ylmBasisConstants = [
    Math.sqrt(1 / (4 * Math.PI)), // l0m0

    -Math.sqrt(3 / (4 * Math.PI)), // l1m_1
    Math.sqrt(3 / (4 * Math.PI)), // l1m0
    -Math.sqrt(3 / (4 * Math.PI)), // l1m1

    Math.sqrt(15 / (4 * Math.PI)), // l2m_2
    -Math.sqrt(15 / (4 * Math.PI)), // l2m_1
    Math.sqrt(5 / (16 * Math.PI)), // l2m0
    -Math.sqrt(15 / (4 * Math.PI)), // l2m1
    Math.sqrt(15 / (16 * Math.PI)) // l2m2
  ]

  // 球谐三阶9个基函数的向量部分
  private static readonly SH3ylmBasisTrigonometricTerms = [
    () => 1, // l00

    (direction: Vector3) => direction.y, // l1_1
    (direction: Vector3) => direction.z, // l10
    (direction: Vector3) => direction.x, // l11

    (direction: Vector3) => direction.x * direction.y, // l2_2
    (direction: Vector3) => direction.y * direction.z, // l2_1
    (direction: Vector3) => 3 * direction.z * direction.z - 1, // l20
    (direction: Vector3) => direction.x * direction.z, // l21
    (direction: Vector3) =>
      direction.x * direction.x - direction.y * direction.y // l22
  ]

  // A * √￣4Π/2l+1 A是传输项的系数
  // A0 = sqrt（π/4）A1 = sqrt（π/3）A2 = sqrt(5π/64)
  private static readonly SHCosKernelConvolution = [
    Math.PI,
    (2 * Math.PI) / 3,
    (2 * Math.PI) / 3,
    (2 * Math.PI) / 3,
    Math.PI / 4,
    Math.PI / 4,
    Math.PI / 4,
    Math.PI / 4,
    Math.PI / 4
  ]

  public cubeMapToSphericalHarmonicsCoefficient(
    cubeMapTextureData: CubeMapInfo
  ) {
    let totalSolidAngle = 0
    // 纹理原始尺寸归一到【-1，1】，对应【-1，1】的步长
    let duv = 2 / cubeMapTextureData.size
    let halfTexel = 0.5 * duv
    // 转换到-1，1的最小值，纹理的最左上角[-0.999..., -0.999...]
    let minUV = halfTexel - 1.0

    for (let faceIndex = 0; faceIndex < faces.length; faceIndex++) {
      let face = faces[faceIndex]
      const dataArray = (<any>cubeMapTextureData)[face]
      let v = minUV
      const stride = cubeMapTextureData.format === 'TEXTUREFORMAT_RGBA' ? 4 : 3

      for (let y = 0; y < cubeMapTextureData.size; y++) {
        let u = minUV

        for (let x = 0; x < cubeMapTextureData.size; x++) {
          // uv转换为cubeMap对应face的世界向量
          let worldDir = this.cubeMapUvToWorldDirection(face as Face, u, v)
          worldDir.normalize()
          // 计算当前uv对应这个像素的立体角，ΔW = W(A)-W(B)+W(C)-W(D)
          let deltaSolidAngle =
            this.computeSolidAngle(u - halfTexel, v - halfTexel) -
            this.computeSolidAngle(u - halfTexel, v + halfTexel) -
            this.computeSolidAngle(u + halfTexel, v - halfTexel) +
            this.computeSolidAngle(u + halfTexel, v + halfTexel)

          let r =
            dataArray[y * cubeMapTextureData.size * stride + x * stride + 0]
          let g =
            dataArray[y * cubeMapTextureData.size * stride + x * stride + 1]
          let b =
            dataArray[y * cubeMapTextureData.size * stride + x * stride + 2]
          if (isNaN(r)) {
            r = 0
          }
          if (isNaN(g)) {
            g = 0
          }
          if (isNaN(b)) {
            b = 0
          }
          const max = 4096
          r = clamp(r, 0, max)
          g = clamp(g, 0, max)
          b = clamp(b, 0, max)

          // L(wi)对应的灯光项，uv坐标对应的纹理颜色值
          const color = new Color3(r, g, b)

          // 系数累加
          this.projectionToBasicFunction(worldDir, color, deltaSolidAngle)

          // 立体角累加
          totalSolidAngle += deltaSolidAngle

          u += duv
        }
        v += duv
      }
    }
    // 球面立体角是4π，实际总立体角是totalSolidAngle，计算纠偏系数
    const correctionFactor = (4.0 * Math.PI) / totalSolidAngle
    // 误差纠偏
    this.scaleSHCoefficient(correctionFactor)

    // 乘上cos传输项的系数
    this.scaleCosToSHCoefficient()

    // 乘上lambertian系数
    this.scaleLambertianSHCoefficient()
  }

  /**
   * 函数有一系列球谐基函数与其系数组合，系数等于函数在对应基函数在球面上的积分
   * 灯光项L投影至基函数，计算系数的累加
   * @param wolrdDir
   * @param color
   * @param deltaSolidAngle
   */
  private projectionToBasicFunction(
    worldDir: Vector3,
    color: Color3,
    deltaSolidAngle: number
  ) {
    let colorVector3 = new Vector3(color.r, color.g, color.b)
    let tempVector3 = new Vector3()

    // 灯光项与立体角相乘
    tempVector3.addScaledVector(colorVector3, deltaSolidAngle)

    // 再与基函数项相乘添加进其系数进行累加
    this.l0m0.add(
      new Vector3()
        .copy(tempVector3)
        .multiplyScalar(this.computeSH3BasicFunction(0, worldDir))
    )
    this.l1m_1.add(
      new Vector3()
        .copy(tempVector3)
        .multiplyScalar(this.computeSH3BasicFunction(1, worldDir))
    )
    this.l1m0.add(
      new Vector3()
        .copy(tempVector3)
        .multiplyScalar(this.computeSH3BasicFunction(2, worldDir))
    )
    this.l1m1.add(
      new Vector3()
        .copy(tempVector3)
        .multiplyScalar(this.computeSH3BasicFunction(3, worldDir))
    )
    this.l2m_2.add(
      new Vector3()
        .copy(tempVector3)
        .multiplyScalar(this.computeSH3BasicFunction(4, worldDir))
    )
    this.l2m_1.add(
      new Vector3()
        .copy(tempVector3)
        .multiplyScalar(this.computeSH3BasicFunction(5, worldDir))
    )
    this.l2m0.add(
      new Vector3()
        .copy(tempVector3)
        .multiplyScalar(this.computeSH3BasicFunction(6, worldDir))
    )
    this.l2m1.add(
      new Vector3()
        .copy(tempVector3)
        .multiplyScalar(this.computeSH3BasicFunction(7, worldDir))
    )
    this.l2m2.add(
      new Vector3()
        .copy(tempVector3)
        .multiplyScalar(this.computeSH3BasicFunction(8, worldDir))
    )
  }

  /**
   * 球谐系数乘缩放系数
   * @param scale
   */
  private scaleSHCoefficient(scale: number) {
    this.l0m0.multiplyScalar(scale)
    this.l1m_1.multiplyScalar(scale)
    this.l1m0.multiplyScalar(scale)
    this.l1m1.multiplyScalar(scale)
    this.l2m_2.multiplyScalar(scale)
    this.l2m_1.multiplyScalar(scale)
    this.l2m0.multiplyScalar(scale)
    this.l2m1.multiplyScalar(scale)
    this.l2m2.multiplyScalar(scale)
  }

  /**
   * 球谐系数乘上cos的系数项，cos是漫反射方程中的传输项：n*wi
   */
  private scaleCosToSHCoefficient() {
    this.l0m0.multiplyScalar(SphericalHarmonics.SHCosKernelConvolution[0])
    this.l1m_1.multiplyScalar(SphericalHarmonics.SHCosKernelConvolution[1])
    this.l1m0.multiplyScalar(SphericalHarmonics.SHCosKernelConvolution[2])
    this.l1m1.multiplyScalar(SphericalHarmonics.SHCosKernelConvolution[3])
    this.l2m_2.multiplyScalar(SphericalHarmonics.SHCosKernelConvolution[4])
    this.l2m_1.multiplyScalar(SphericalHarmonics.SHCosKernelConvolution[5])
    this.l2m0.multiplyScalar(SphericalHarmonics.SHCosKernelConvolution[6])
    this.l2m1.multiplyScalar(SphericalHarmonics.SHCosKernelConvolution[7])
    this.l2m2.multiplyScalar(SphericalHarmonics.SHCosKernelConvolution[8])
  }

  /**
   * 漫反射方程中1/π
   */
  private scaleLambertianSHCoefficient() {
    this.scaleSHCoefficient(1.0 / Math.PI)
  }

  /**
   * uv坐标转换为世界坐标下的向量方向
   * @param face cubeMap的face方向
   * @param u [-1,1]
   * @param v [-1,1]
   */
  private cubeMapUvToWorldDirection(face: Face, u: number, v: number): Vector3 {
    // uv坐标已缩放至[-1，1]，以对应要转换到的[-1,1]的立方体坐标
    let dir = new Vector3()
    switch (face) {
      case 'right':
        dir
          .add(new Vector3(0, 0, -u))
          .add(new Vector3(0, -v, 0))
          .add(new Vector3(1, 0, 0))
        break
      case 'left':
        dir
          .add(new Vector3(0, 0, u))
          .add(new Vector3(0, -v, 0))
          .add(new Vector3(-1, 0, 0))
        break
      case 'up':
        dir
          .add(new Vector3(u, 0, 0))
          .add(new Vector3(0, 0, v))
          .add(new Vector3(0, 1, 0))
        break
      case 'down':
        dir
          .add(new Vector3(u, 0, 0))
          .add(new Vector3(0, 0, -v))
          .add(new Vector3(0, -1, 0))
        break
      case 'front':
        dir
          .add(new Vector3(u, 0, 0))
          .add(new Vector3(0, -v, 0))
          .add(new Vector3(0, 0, 1))
        break
      case 'back':
        dir
          .add(new Vector3(-u, 0, 0))
          .add(new Vector3(0, -v, 0))
          .add(new Vector3(0, 0, -1))
        break
      default:
        break
    }

    return dir
  }

  /**
   * 计算[0,0]到[x,y]的立体角
   * @param x
   * @param y
   * @returns
   */
  private computeSolidAngle(x: number, y: number): number {
    return Math.atan2(x * y, Math.sqrt(x * x + y * y + 1))
  }

  /**
   * 计算球谐基函数Y(w)
   * @param lm
   * @param direction
   * @returns
   */
  private computeSH3BasicFunction(lm: number, direction: Vector3) {
    return (
      SphericalHarmonics.SH3ylmBasisConstants[lm] *
      SphericalHarmonics.SH3ylmBasisTrigonometricTerms[lm](direction)
    )
  }
}
