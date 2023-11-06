import Engine from '../engine/Engine'
import SphericalHarmonics from '../misc/SphericalHarmonics'
import Texture, { TextureParametersOptions } from './Texture'

export default class TextureCube extends Texture {
  public isCube: boolean = true
  public sphericalHarmonics: SphericalHarmonics
  public isInvCubic: boolean = false
  constructor(engine: Engine, url: string, options?: TextureParametersOptions) {
    super(engine, url, options)
    this.createCubeTexture()
  }
}
