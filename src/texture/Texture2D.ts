import Engine from '../engine/Engine'
import Texture from './Texture'

export default class Texture2D extends Texture {
  constructor(engine: Engine, url: string) {
    super(engine, url)
    this.createTexture()
    this.updateTexture()
    this.loadTexture()
  }
}
