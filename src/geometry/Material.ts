export default class Material {
  public color: any
  public opacity: number
  constructor(options: any) {
    const { color, opacity } = options
    this.color = color
    this.opacity = opacity
  }
}
