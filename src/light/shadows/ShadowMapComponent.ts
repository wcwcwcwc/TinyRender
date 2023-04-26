import FrameBufferObject from '../../webgl/FrameBufferObject'
import ShadowMapMaterial from '../../geometry/ShadowMapMaterial'

// shadowMapComponent类，内部定义
interface ShadowMapComponentOptions {
  normalBias: number
  bias: number
  light: any
}
export default class ShadowMapComponent {
  fbo: FrameBufferObject
  pass: number
  material: ShadowMapMaterial
  light: any
  bias: number
  normalBias: number
  constructor(
    gl: any,
    width: number,
    height: number,
    options: ShadowMapComponentOptions
  ) {
    this.fbo = new FrameBufferObject({ gl, width, height })
    this.material = new ShadowMapMaterial(gl, width, height)
    this.light = options.light
    this.bias = options.bias || 0.1
    this.normalBias = options.normalBias || 0.001
  }
}
