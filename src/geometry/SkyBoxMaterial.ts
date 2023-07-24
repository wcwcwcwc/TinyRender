import Material from './Material'
//@ts-ignore
import skyBoxFS from '../webgl/shaders/skyBoxFS.glsl'
//@ts-ignore
import skyBoxVS from '../webgl/shaders/skyBoxVS.glsl'
import Program from '../webgl/Program'
import HDRCubeTexture from '../texture/HDRCubeTexture'

interface SkyBoxMaterialOptions {
  environmentTexture: HDRCubeTexture
}

export default class SkyBoxMaterial extends Material {
  public environmentTexture: HDRCubeTexture
  constructor(options: SkyBoxMaterialOptions) {
    super({})
    this.environmentTexture = options.environmentTexture
  }
  initProgram(gl: any, engine: any) {
    if (!this.program) {
      let vs_source = skyBoxVS
      let fs_source = skyBoxFS
      let headShader_vs = [`#version 300 es`]
      let headShader_fs = [
        `#version 300 es
               precision highp float;`
      ]
      vs_source = this.replaceInclude(vs_source)
      fs_source = this.replaceInclude(fs_source)

      vs_source = headShader_vs.concat(vs_source).join('\n')
      fs_source = headShader_fs.concat(fs_source).join('\n')
      this.program = new Program({
        gl,
        vs: vs_source,
        fs: fs_source
      })
    }
  }
  bindSkyBoxUniform(engine: any, uniformLocations: any) {
    let gl = engine._gl
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.environmentTexture.webglTexture)
    gl.uniform1i(uniformLocations['u_reflectionCubeSampler'], 0)
  }
  draw() {}
}
