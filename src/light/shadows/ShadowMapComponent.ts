import FrameBufferObject from '../../webgl/FrameBufferObject'
import ShadowMapMaterial from '../../geometry/ShadowMapMaterial'

// shadowMapComponent类，内部定义
interface ShadowMapComponentOptions {}
export default class ShadowMapComponent {
  fbo: FrameBufferObject
  pass: number
  material: ShadowMapMaterial
  constructor(
    gl: any,
    width: number,
    height: number,
    options: ShadowMapComponentOptions
  ) {
    this.fbo = new FrameBufferObject({ gl, width, height })
    this.material = new ShadowMapMaterial(gl, width, height)
  }
}
