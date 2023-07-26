import HDRCubeTexture from '../texture/HDRCubeTexture'
import Texture from '../texture/Texture'
// 该类默认金属工作流

interface PBRMaterialOptions {
  baseColor: string
  baseColorTexture: Texture
  metallic: number
  roughness: number
  metallicRoughnessTexture: Texture
  reflectionTexture: HDRCubeTexture
}

export default class PBRMaterial {
  public baseColor: string
  public baseColorTexture: Texture
  public metallic: number
  public roughness: number
  public metallicRoughnessTexture: Texture
  public reflectionTexture: HDRCubeTexture
  constructor(options: PBRMaterialOptions) {
    this.baseColor = options.baseColor
    this.baseColorTexture = options.baseColorTexture
    this.metallic = options.metallic
    this.roughness = options.roughness
    this.metallicRoughnessTexture = options.metallicRoughnessTexture
    this.reflectionTexture = options.reflectionTexture
  }
}
