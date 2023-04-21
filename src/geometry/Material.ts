import { rgbaToArray } from '../math/Common'
export default class Material {
  public color: any
  public opacity: number
  public colorArray: number[]
  constructor(options: any) {
    const { color, opacity } = options
    this.color = color
    this.opacity = opacity
    this.colorArray = rgbaToArray(this.color)
  }
  setColor(color: string) {
    this.color = color
    this.colorArray = rgbaToArray(this.color)
  }
}
