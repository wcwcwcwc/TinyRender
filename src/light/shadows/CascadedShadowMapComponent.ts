import FrameBufferObject from '../../webgl/FrameBufferObject'
import ShadowMapMaterial from '../../geometry/ShadowMapMaterial'
import Light from '../Light'
import DirectionLight from '../DirectionLight'
import Engine from '../../engine/Engine'
import { Matrix4 } from '../../math/Matrix4'
import { Vector3 } from '../../math/Vector3'
import ShadowMapComponent from './ShadowMapComponent'

// shadowMapComponent类，内部定义
// 实现四种采样方式
enum Sample {
  'DEFAULT',
  'POISSON',
  'PCF',
  'PCSS'
}
interface CascadedShadowMapComponentOptions {
  normalBias: number
  bias: number
  light: Light
  sample: Sample
  PCSSSearchRadius: number
  PCSSFilterRadius: number
  enableCascadedShadowMap: boolean
  cascadesNum: number
  lambda: number
}
export default class CascadedShadowMapComponentComponent extends ShadowMapComponent {
  private static readonly _FrustumCornersNDCSpace = [
    new Vector3(-1.0, +1.0, -1.0),
    new Vector3(+1.0, +1.0, -1.0),
    new Vector3(+1.0, -1.0, -1.0),
    new Vector3(-1.0, -1.0, -1.0),
    new Vector3(-1.0, +1.0, +1.0),
    new Vector3(+1.0, +1.0, +1.0),
    new Vector3(+1.0, -1.0, +1.0),
    new Vector3(-1.0, -1.0, +1.0)
  ]

  engine: Engine
  fbo: FrameBufferObject
  pass: number
  material: ShadowMapMaterial
  light: Light
  bias: number
  normalBias: number
  sample: Sample
  PCSSSearchRadius: number
  PCSSFilterRadius: number
  enableCascadedShadowMap: boolean = false
  cascadesNum: number
  lambda: number
  _cascades: Array<any>
  _currentLayer: number
  _viewSpaceFrustumsZ: Array<number>
  _viewMatrices: Array<Matrix4>
  _projectionMatrices: Array<Matrix4>
  _transformMatrices: Array<Matrix4>
  _transformMatricesAsArray: Float32Array
  _frustumLengths: Array<number>
  _lightSizeUVCorrection: Array<number>
  _depthCorrection: Array<number>
  _frustumCornersWorldSpace: Array<Array<Vector3>>
  _frustumCenter: Array<Vector3>
  _shadowCameraPos: Array<Vector3>
  _cascadeMinExtents: Array<Vector3>
  _cascadeMaxExtents: Array<Vector3>

  lightLookAt: Vector3
  lightPosition: Vector3
  lightDirection: Vector3

  constructor(
    engine: Engine,
    width: number,
    height: number,
    options: CascadedShadowMapComponentOptions
  ) {
    super(engine, width, height, options)
    this.cascadesNum = options.cascadesNum || 4
    this.lambda = options.lambda || 0.5
    if (this.enableCascadedShadowMap && this.light instanceof DirectionLight) {
      this.initComponent()
      this.splitFrustum()
      this.computeLightMatrices()
    }
  }

  initComponent() {
    // CSM 开启级联阴影，默认采用stabilize CSM
    // 仅支持平行光
    this._cascades = []
    this._viewMatrices = []
    this._projectionMatrices = []
    this._transformMatrices = []
    this._cascadeMinExtents = []
    this._cascadeMaxExtents = []
    this._frustumCenter = []
    this._shadowCameraPos = []
    this._frustumCornersWorldSpace = []
    for (
      let cascadeIndex = 0;
      cascadeIndex < this.cascadesNum;
      ++cascadeIndex
    ) {
      this._cascades[cascadeIndex] = {
        prevBreakDistance: 0,
        breakDistance: 0
      }

      this._viewMatrices[cascadeIndex] = new Matrix4()
      this._projectionMatrices[cascadeIndex] = new Matrix4()
      this._transformMatrices[cascadeIndex] = new Matrix4()
      this._cascadeMinExtents[cascadeIndex] = new Vector3()
      this._cascadeMaxExtents[cascadeIndex] = new Vector3()
      this._frustumCenter[cascadeIndex] = new Vector3()
      this._shadowCameraPos[cascadeIndex] = new Vector3()
      this._frustumCornersWorldSpace[cascadeIndex] = new Array(
        CascadedShadowMapComponentComponent._FrustumCornersNDCSpace.length
      )

      for (
        let i = 0;
        i < CascadedShadowMapComponentComponent._FrustumCornersNDCSpace.length;
        ++i
      ) {
        this._frustumCornersWorldSpace[cascadeIndex][i] = new Vector3()
      }
    }
  }
  /**
   * 分割相机视锥体
   */
  splitFrustum() {
    const { camera } = this.engine
    const near = camera.nearZ
    const far = camera.farZ
    const cameraRange = far - near
    const range = far - near,
      ratio = far / near
    for (
      let cascadeIndex = 0;
      cascadeIndex < this._cascades.length;
      ++cascadeIndex
    ) {
      const p = (cascadeIndex + 1) / this.cascadesNum,
        log = near * ratio ** p,
        uniform = near + range * p

      const d = this.lambda * (log - uniform) + uniform

      this._cascades[cascadeIndex].prevBreakDistance =
        cascadeIndex === 0 ? 0 : this._cascades[cascadeIndex - 1].breakDistance
      this._cascades[cascadeIndex].breakDistance = (d - near) / cameraRange

      this._viewSpaceFrustumsZ[cascadeIndex] = d
      this._frustumLengths[cascadeIndex] =
        (this._cascades[cascadeIndex].breakDistance -
          this._cascades[cascadeIndex].prevBreakDistance) *
        cameraRange
    }
  }
  /**
   * 计算灯光视图矩阵
   */
  computeLightMatrices() {
    this.lightLookAt = new Vector3(
      this.light.lookAt[0],
      this.light.lookAt[1],
      this.light.lookAt[2]
    )
    this.lightPosition = new Vector3(
      this.light.position[0],
      this.light.position[1],
      this.light.position[2]
    )
    this.lightDirection = new Vector3()
    this.lightDirection.subVectors(this.lightPosition, this.lightLookAt)
    this.lightDirection.normalize()
    for (
      let cascadeIndex = 0;
      cascadeIndex < this._cascades.length;
      ++cascadeIndex
    ) {
      // 计算相机各段视锥体八个点的世界坐标
      this.computeFrustumInWorldSpace(cascadeIndex)
      // 通过求取相机视锥包围球，计算灯光视锥（正交）的最大最小
      this.computeCascadeFrustum(cascadeIndex)
    }
  }
  /**
   * 计算相机各段视锥体八个点的世界坐标
   * @param cascadeIndex
   */
  computeFrustumInWorldSpace(cascadeIndex: number) {
    const { camera } = this.engine
    const prevSplitDist = this._cascades[cascadeIndex].prevBreakDistance,
      splitDist = this._cascades[cascadeIndex].breakDistance
    let cameraViewMatrix = camera.setViewMatrix() // 更新视图矩阵
    let cameraProjectionMatrix = camera.camera.projectionMatrix
    let cameraViewProMatrix = new Matrix4()
    cameraViewProMatrix.multiply(cameraProjectionMatrix, cameraViewMatrix)
    let invertCameraViewProMatrix = new Matrix4()
    invertCameraViewProMatrix.copy(cameraViewProMatrix).invert() // 相机视图投影逆矩阵
    for (
      let cornerIndex = 0;
      cornerIndex <
      CascadedShadowMapComponentComponent._FrustumCornersNDCSpace.length;
      ++cornerIndex
    ) {
      let NDCSpaceVector =
        CascadedShadowMapComponentComponent._FrustumCornersNDCSpace[cornerIndex]
      let frustumCornersWorldSpaceVector = new Vector3()
      frustumCornersWorldSpaceVector
        .copy(NDCSpaceVector)
        .applyMatrix4(invertCameraViewProMatrix)
      // NDC转世界坐标
      this._frustumCornersWorldSpace[cascadeIndex][
        cornerIndex
      ] = frustumCornersWorldSpaceVector
    }
    // 根据视锥分段，求取各段八个点世界坐标
    for (
      let cornerIndex = 0;
      cornerIndex <
      CascadedShadowMapComponentComponent._FrustumCornersNDCSpace.length / 2;
      ++cornerIndex
    ) {
      let tempVector = new Vector3()
      let tempVector2 = new Vector3()
      tempVector.subVectors(
        this._frustumCornersWorldSpace[cascadeIndex][cornerIndex + 4],
        this._frustumCornersWorldSpace[cascadeIndex][cornerIndex]
      )
      tempVector2.copy(tempVector).multiplyScalar(prevSplitDist)
      tempVector.multiplyScalar(splitDist)
      tempVector.addScalar(
        this._frustumCornersWorldSpace[cascadeIndex][cornerIndex]
      )
      this._frustumCornersWorldSpace[cascadeIndex][cornerIndex + 4].copy(
        tempVector
      )
      this._frustumCornersWorldSpace[cascadeIndex][cornerIndex].addScalar(
        tempVector2
      )
    }
  }

  /**
   * 通过求取相机视锥包围球，计算灯光视锥（正交）的最大最小
   * @param cascadeIndex
   */
  computeCascadeFrustum(cascadeIndex: number) {}
}
