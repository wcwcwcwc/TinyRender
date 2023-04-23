import Light from './Light'
import { Matrix4 } from '../math/Matrix4'
import { Vector3 } from '../math/Vector3'
import { Euler } from '../math/Euler'
import { Quaternion } from '../math/Quaternion'

interface SpotLightOptions {
  position: number[]
  color: string
  intensity: number
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
  }
  getProjectionMatrix() {
    // 同相机的透视投影矩阵
  }
}
