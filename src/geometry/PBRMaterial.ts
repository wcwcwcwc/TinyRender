import Texture from '../texture/Texture'
// 该类默认金属工作流

interface PBRMaterialOptions {
  baseColor: string
  baseColorTexture: Texture
}

export default class PBRMaterial {
  constructor(options: PBRMaterialOptions) {}
}
