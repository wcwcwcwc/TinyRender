import FrameBufferObject from '../../webgl/FrameBufferObject'
import ShadowMapMaterial from '../../geometry/ShadowMapMaterial'

// shadowMapComponent类，内部定义
// 实现四种采样方式
enum Sample {
  'DEFAULT',
  'POISSON',
  'PCF',
  'PCSS'
}
export interface ShadowMapComponentOptions {
  normalBias: number
  bias: number
  light: any
  sample: Sample
  PCSSSearchRadius: number
  PCSSFilterRadius: number
  layers: number
}
export default class ShadowMapComponent {
  fbo: FrameBufferObject
  pass: number
  material: ShadowMapMaterial
  light: any
  bias: number
  normalBias: number
  sample: Sample
  PCSSSearchRadius: number
  PCSSFilterRadius: number
  constructor(
    gl: any,
    width: number,
    height: number,
    options: ShadowMapComponentOptions
  ) {
    // shadowMap 默认深度缓冲开启纹理对比【webgl2：硬件加速】
    this.fbo = new FrameBufferObject({
      gl,
      width,
      height,
      depthTextureComparison: true,
      layers: options.layers = 0
    })
    this.material = new ShadowMapMaterial(gl, width, height)
    this.light = options.light
    this.bias = options.bias || 0.1
    this.normalBias = options.normalBias || 0.001
    this.sample = options.sample || Sample.DEFAULT
    this.PCSSSearchRadius = options.PCSSSearchRadius || 37
    this.PCSSFilterRadius = options.PCSSFilterRadius || 37
  }
}
