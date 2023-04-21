/**
 * 默认点光源
 *
 */

import { clamp } from '../math/Common'
interface AmbientLightOptions {
  intensity: number
}
export default class AmbientLight {
  intensity: number
  constructor(options: AmbientLightOptions) {
    this.intensity = options.intensity || 0.1
  }
  setIntensity(intensity: number) {
    this.intensity = clamp(intensity, 0, 1)
  }
}
