export default class Material {
  public color: any
  public opacity: number
  public colorArray: number[]
  constructor(options: any) {
    const { color, opacity } = options
    this.color = color
    this.opacity = opacity
    this.rgbaToArray()
  }
  rgbaToArray() {
    this.colorArray = this.color
      .split('(')[1]
      .split(')')[0]
      .split(',')
      .map((item: any) => Number(item))
  }
}
