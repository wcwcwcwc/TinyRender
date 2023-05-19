import FrameBufferObject from '../../webgl/FrameBufferObject'
import ShadowMapMaterial from '../../geometry/ShadowMapMaterial'
import Light from '../Light'
import DirectionLight from '../DirectionLight'
import Engine from '../../engine/Engine'
import { Matrix4 } from '../../math/Matrix4'
import { Vector3 } from '../../math/Vector3'
import { Quaternion } from '../../math/Quaternion'
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

  width: number
  height: number

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
  _transformMatricesAsArray: []
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
    super(engine._gl, width, height, options)
    this.engine = engine
    this.width = width
    this.height = height
    this.cascadesNum = options.cascadesNum || 4
    this.lambda = options.lambda || 0.5
    this.enableCascadedShadowMap = options.enableCascadedShadowMap || false
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

    this._viewSpaceFrustumsZ = new Array(this.cascadesNum)
    this._frustumLengths = new Array(this.cascadesNum)

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
      this.computeCascadeMatrix(cascadeIndex)
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
    cameraViewProMatrix.multiplyMatrices(
      cameraProjectionMatrix,
      cameraViewMatrix
    )
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
      tempVector.add(
        this._frustumCornersWorldSpace[cascadeIndex][cornerIndex],
        undefined
      )
      this._frustumCornersWorldSpace[cascadeIndex][cornerIndex + 4].copy(
        tempVector
      )
      this._frustumCornersWorldSpace[cascadeIndex][cornerIndex].add(
        tempVector2,
        undefined
      )
    }
  }

  /**
   * 通过求取相机视锥包围球，计算灯光视锥（正交）的最大最小
   * @param cascadeIndex
   */
  computeCascadeFrustum(cascadeIndex: number) {
    this._cascadeMinExtents[cascadeIndex].copy(
      new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE)
    )
    this._cascadeMaxExtents[cascadeIndex].copy(
      new Vector3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE)
    )
    this._frustumCenter[cascadeIndex].copy(new Vector3(0, 0, 0))

    // 通过各个点累加再除，计算视锥体中心
    for (
      let cornerIndex = 0;
      cornerIndex < this._frustumCornersWorldSpace[cascadeIndex].length;
      ++cornerIndex
    ) {
      this._frustumCenter[cascadeIndex].add(
        this._frustumCornersWorldSpace[cascadeIndex][cornerIndex],
        undefined
      )
    }
    this._frustumCenter[cascadeIndex].multiplyScalar(
      1 / this._frustumCornersWorldSpace[cascadeIndex].length
    )

    // Stabilize Cascaded
    // 构建包围球，这里球半径的计算方式采用中心点离各个点最远的那个点的距离，故不是最紧包围球，降低贴图利用率
    let sphereRadius = 0
    for (
      let cornerIndex = 0;
      cornerIndex < this._frustumCornersWorldSpace[cascadeIndex].length;
      ++cornerIndex
    ) {
      let temp = new Vector3()
      let dist = temp
        .subVectors(
          this._frustumCornersWorldSpace[cascadeIndex][cornerIndex],
          this._frustumCenter[cascadeIndex]
        )
        .length()
      sphereRadius = Math.max(sphereRadius, dist)
    }
    sphereRadius = Math.ceil(sphereRadius * 16) / 16
    // 包围球的最大最小范围，也是灯光正交矩阵参数
    this._cascadeMaxExtents[cascadeIndex].set(
      sphereRadius,
      sphereRadius,
      sphereRadius
    )
    this._cascadeMinExtents[cascadeIndex].set(
      -sphereRadius,
      -sphereRadius,
      -sphereRadius
    )
  }
  /**
   * 计算各视锥灯光矩阵
   * @param cascadeIndex
   */
  computeCascadeMatrix(cascadeIndex: number) {
    let cascadeExtentsRange = new Vector3()
    cascadeExtentsRange.subVectors(
      this._cascadeMaxExtents[cascadeIndex],
      this._cascadeMinExtents[cascadeIndex]
    )
    // 灯光位置计算
    let temp = new Vector3()
    temp
      .copy(this.lightDirection)
      .multiplyScalar(this._cascadeMinExtents[cascadeIndex].z)
    this._shadowCameraPos[cascadeIndex]
      .copy(this._frustumCenter[cascadeIndex])
      .add(temp, undefined)

    // 灯光视图矩阵
    let lookAtMatrix = new Matrix4()
    lookAtMatrix.lookAt(
      this._shadowCameraPos[cascadeIndex],
      this._frustumCenter[cascadeIndex],
      new Vector3(0, 1, 0)
    )
    let quaternion = new Quaternion()
    quaternion.setFromRotationMatrix(lookAtMatrix)
    this._viewMatrices[cascadeIndex].compose(
      this._shadowCameraPos[cascadeIndex],
      quaternion,
      new Vector3(1, 1, 1)
    )
    this._viewMatrices[cascadeIndex].invert()

    let minZ = 0,
      maxZ = cascadeExtentsRange.z

    // TODO:mesh构建包围盒与视锥包围再取并集
    // 灯光投影矩阵
    this._projectionMatrices[cascadeIndex].makeOrthographic(
      this._cascadeMinExtents[cascadeIndex].x,
      this._cascadeMaxExtents[cascadeIndex].x,
      this._cascadeMaxExtents[cascadeIndex].y,
      this._cascadeMinExtents[cascadeIndex].y,
      minZ,
      maxZ
    )

    this._cascadeMinExtents[cascadeIndex].z = minZ
    this._cascadeMaxExtents[cascadeIndex].z = maxZ

    // 灯光视图矩阵
    this._transformMatrices[cascadeIndex].multiplyMatrices(
      this._projectionMatrices[cascadeIndex],
      this._viewMatrices[cascadeIndex]
    )

    // 构建偏移矩阵，保证相机移动前和移动后，世界空间中的同一点都能投影到相同纹理贴图上
    let zeroVector = new Vector3() // 世界坐标原点
    zeroVector.applyMatrix4(this._transformMatrices[cascadeIndex]) // 变换到裁剪坐标
    zeroVector.multiplyScalar(this.width / 2) // 纹理坐标
    let temp2 = new Vector3()
    temp2.set(
      Math.round(zeroVector.x),
      Math.round(zeroVector.y),
      Math.round(zeroVector.z)
    )
    temp2.sub(zeroVector, undefined).multiplyScalar(2 / this.width)
    let tempMatrix = new Matrix4()
    tempMatrix.makeTranslation(temp2.x, temp2.y, 0.0) // 偏移矩阵
    this._projectionMatrices[cascadeIndex].multiplyMatrices(
      tempMatrix,
      this._projectionMatrices[cascadeIndex]
    ) // 对投影矩阵进行偏移
    this._transformMatrices[cascadeIndex].multiplyMatrices(
      this._projectionMatrices[cascadeIndex],
      this._viewMatrices[cascadeIndex]
    )
    this._transformMatrices[cascadeIndex].toArray(
      this._transformMatricesAsArray,
      cascadeIndex * 16
    )
  }
}
