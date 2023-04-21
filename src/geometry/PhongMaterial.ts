import Material from './Material'
interface PhongMaterialOptions {
  specularStrength: number
  shininess: number
  color: string
  opacity: number
}
export default class PhongMaterial extends Material {
  specularStrength: number
  shininess: number
  color: string
  opacity: number
  constructor(options: PhongMaterialOptions) {
    super({
      color: options.color,
      opacity: options.opacity
    })
    this.type = 'PhongMaterial'
    this.specularStrength = options.specularStrength || 0.5
    this.shininess = options.shininess || 32
  }
  setSpecularStrength(strength: number) {
    this.specularStrength = strength
  }
  setShininess(shininess: number) {
    this.shininess = shininess
  }
}
