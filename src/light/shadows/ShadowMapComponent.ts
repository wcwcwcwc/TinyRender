import FrameBufferObject from '../../webgl/FrameBufferObject'

// shadowMapComponent类，内部定义
interface ShadowMapComponentOptions {}
export default class ShadowMapComponent {
  fbo: FrameBufferObject
  constructor(
    gl: any,
    width: number,
    height: number,
    options: ShadowMapComponentOptions
  ) {
    this.fbo = new FrameBufferObject({ gl, width, height })
  }
}
