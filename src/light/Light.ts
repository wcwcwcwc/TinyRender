import { rgbaToArray } from '../math/Common'
import { Matrix4 } from '../math/Matrix4'
import { Vector3 } from '../math/Vector3'
import { Euler } from '../math/Euler'
import { Quaternion } from '../math/Quaternion'
/**
 * 默认点光源
 *
 */

interface LightOptions {
  position: number[]
  color: string
  intensity: number
}
export default class Light {
  position: number[]
  color: string
  intensity: number
  colorArray: number[]
  public viewMatrix: any
  public viewMatrixInverse: any
  public target: any
  public up: any
  public rotation: Euler
  public quaternion: Quaternion
  public lookAt: number[]
  public scale: any
  public projectionMatrix: Matrix4
  constructor(options: LightOptions) {
    this.position = options.position
    this.color = options.color
    this.intensity = options.intensity
    this.colorArray = rgbaToArray(this.color)
    this.scale = new Vector3(1, 1, 1)
    this.target = new Vector3(0, 0, 0)
    this.up = new Vector3(0, 1, 0)
    this.rotation = new Euler()
    this.quaternion = new Quaternion()
    this.lookAt = [0, 0, 0]
  }
  setPosition(position: number[]) {
    this.position = position
  }
  setColor(color: string) {
    this.color = color
  }
  setIntensity(intensity: number) {
    this.intensity = intensity
  }
  setViewMatrix() {
    // 设定相机看向目标，求出相机自身旋转
    // 相机位置、相机自身旋转、缩放比求出视图矩阵
    let lookAtMatrix = new Matrix4()
    let lookAtVector = new Vector3(
      this.lookAt[0],
      this.lookAt[1],
      this.lookAt[2]
    )
    let lightPosition = new Vector3(
      this.position[0],
      this.position[1],
      this.position[2]
    )
    lookAtMatrix.lookAt(lightPosition, lookAtVector, this.up)
    this.quaternion.setFromRotationMatrix(lookAtMatrix)

    this.viewMatrix = new Matrix4()
    this.viewMatrix.compose(lightPosition, this.quaternion, this.scale)
    this.viewMatrix.invert()
    return this.viewMatrix
  }
  getProjectionMatrix() {
    return this.projectionMatrix
  }
}
