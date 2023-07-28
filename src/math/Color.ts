export class Color3 {
  constructor(
    public r: number = 0,

    public g: number = 0,

    public b: number = 0
  ) {}

  public toString(): string {
    return `rgb(${this.r}, ${this.g}, ${this.b})`
  }
  public getClassName(): string {
    return 'Color3'
  }
  public toColor4(alpha: number = 1): Color4 {
    return new Color4(this.r, this.g, this.b, alpha)
  }
  public asArray(): number[] {
    return [this.r, this.g, this.b]
  }
}

export class Color4 {
  constructor(
    public r: number = 0,

    public g: number = 0,

    public b: number = 0,

    public a: number = 1
  ) {}

  public toString(): string {
    return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`
  }
  public getClassName(): string {
    return 'Color4'
  }
  public asArray(): number[] {
    return [this.r, this.g, this.b, this.a]
  }
}
