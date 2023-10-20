/**
 * SH用以系数替代传统的漫反射贴图，减少存储量
 * 加载cubeMap时，用以从此环境贴图中计算球谐系数：L与A
 * 默认计算三阶的球谐，共9项
 * pbr着色器中，计算漫反射时，传入此9项系数。
 */
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

  public cubeMapToSphericalHarmonicsCoefficient(
    CubeMapTextureData: CubeMapInfo
  ) {
    let totalSolidAngle = 0.0
  }

  /**
   * uv坐标转换为世界坐标下的向量方向
   * @param face cubeMap的face方向
   * @param u [-1,1]
   * @param v [-1,1]
   */
  static cubeMapUvToWorldDirection(face: Face, u: number, v: number): Vector3 {
    // uv坐标已缩放至[-1，1]
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
}
