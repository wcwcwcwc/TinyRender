import Light from './Light'
import { Matrix4 } from '../math/Matrix4'
import { Vector3 } from '../math/Vector3'
import { Euler } from '../math/Euler'
import { Quaternion } from '../math/Quaternion'

interface DirectionOptions {
  position: number[]
  color: string
  intensity: number
  left: number
  right: number
  top: number
  bottom: number
  near: number
  far: number
}

export default class DirectionLight extends Light {
  public viewMatrix: any
  public viewMatrixInverse: any
  public target: any
  public up: any
  public rotation: Euler
  public quaternion: Quaternion
  public lookAt: number[]
  public scale: any
  public type: string
  public projectionMatrix: Matrix4
  left: number
  right: number
  top: number
  bottom: number
  near: number
  far: number
  constructor(options: DirectionOptions) {
    super({
      position: options.position,
      color: options.color,
      intensity: options.intensity
    })
    this.type = 'DirectionLight'
    this.scale = new Vector3(1, 1, 1)
    this.target = new Vector3(0, 0, 0)
    this.up = new Vector3(0, 1, 0)
    this.rotation = new Euler()
    this.quaternion = new Quaternion()
    this.lookAt = [0, 0, 0]
    this.left = options.left || -100
    this.right = options.right || 100
    this.top = options.top || 100
    this.bottom = options.bottom || -100
    this.near = options.near || -100
    this.far = options.far || 100
    this.projectionMatrix = new Matrix4()
  }
  getProjectionMatrix() {
    const dx = (this.right - this.left) / 2
    const dy = (this.top - this.bottom) / 2
    const cx = (this.right + this.left) / 2
    const cy = (this.top + this.bottom) / 2

    let left = cx - dx
    let right = cx + dx
    let top = cy + dy
    let bottom = cy - dy
    this.projectionMatrix.makeOrthographic(
      left,
      right,
      top,
      bottom,
      this.near,
      this.far
    )
    return this.projectionMatrix
    // 同相机的透视投影矩阵
  }
}
