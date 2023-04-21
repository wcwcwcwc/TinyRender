import { rgbaToArray } from '../math/Common'
export default class Material {
  public type: string
  public color: any
  public opacity: number
  public colorArray: number[]
  constructor(options: any) {
    const { color, opacity } = options
    this.type = 'Material'
    this.color = color
    this.opacity = opacity
    this.colorArray = rgbaToArray(this.color)
  }
  setColor(color: string) {
    this.color = color
    this.colorArray = rgbaToArray(this.color)
  }
}
