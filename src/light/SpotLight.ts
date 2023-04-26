import Light from './Light'
import { Matrix4 } from '../math/Matrix4'
import { Vector3 } from '../math/Vector3'
import { Euler } from '../math/Euler'
import { Quaternion } from '../math/Quaternion'

interface SpotLightOptions {
  position: number[]
  color: string
  intensity: number
  fov: number
  aspect: number
  nearZ: number
  farZ: number
}

export default class SpotLight extends Light {
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
  public fov: number
  public aspect: number
  public nearZ: number
  public farZ: number
  constructor(options: SpotLightOptions) {
    super({
      position: options.position,
      color: options.color,
      intensity: options.intensity
    })
    this.type = 'SpotLight'
    this.scale = new Vector3(1, 1, 1)
    this.target = new Vector3(0, 0, 0)
    this.up = new Vector3(0, 1, 0)
    this.rotation = new Euler()
    this.quaternion = new Quaternion()
    this.lookAt = [0, 0, 0]
    this.fov = options.fov || 75
    this.aspect = options.aspect || 1
    this.nearZ = options.nearZ || 0.01
    this.farZ = options.farZ || 1000
    this.projectionMatrix = new Matrix4()
  }
  getProjectionMatrix() {
    const near = this.nearZ
    let top = near * Math.tan((Math.PI / 180) * 0.5 * this.fov)
    let height = 2 * top
    let width = this.aspect * height
    let left = -0.5 * width
    this.projectionMatrix.makePerspective(
      left,
      left + width,
      top,
      top - height,
      near,
      this.farZ
    )
    return this.projectionMatrix
  }
}
