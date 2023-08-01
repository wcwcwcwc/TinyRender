import Engine from '../engine/Engine'
import Texture, { TextureParametersOptions } from './Texture'

export default class TextureCube extends Texture {
  constructor(engine: Engine, url: string, options?: TextureParametersOptions) {
    super(engine, url, options)
    this.createCubeTexture()
  }
}
