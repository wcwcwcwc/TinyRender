import { rgbaToArray } from '../math/Common'
/**
 * 默认点光源
 *
 */

interface LightOptions {
  position: number[]
  color: string
  intensity: number
}
export default class Light {
  position: number[]
  color: string
  intensity: number
  colorArray: number[]
  constructor(options: LightOptions) {
    this.position = options.position
    this.color = options.color
    this.intensity = options.intensity
    this.colorArray = rgbaToArray(this.color)
  }
  setPosition(position: number[]) {
    this.position = position
  }
  setColor(color: string) {
    this.color = color
  }
  setIntensity(intensity: number) {
    this.intensity = intensity
  }
}
