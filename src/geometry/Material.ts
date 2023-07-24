import { rgbaToArray } from '../math/Common'
import Program from '../webgl/Program'
//@ts-ignore
import basicFS from '../webgl/shaders/basicFS.glsl'
//@ts-ignore
import basicVS from '../webgl/shaders/basicVS.glsl'
import { ShaderInclude } from '../webgl/shaders/shadersInclude'

export default class Material {
  public type: string
  public color: any
  public opacity: number
  public colorArray: number[]
  public program: Program
  public depthProgram: Program
  public defines: string[]
  public isReceiveShadow: true
  constructor(options: any) {
    const { color, opacity, isReceiveShadow } = options
    this.type = 'Material'
    this.color = color || 'rgba(1,1,1,1)'
    this.opacity = opacity || 1
    this.isReceiveShadow = true
    this.colorArray = rgbaToArray(this.color)
    this.defines = []
  }
  setColor(color: string) {
    this.color = color
    this.colorArray = rgbaToArray(this.color)
  }
  // render完成，收集依赖，建立缓存
  initProgram(gl: any, engine: any) {
    if (!this.program) {
      let vs_source = basicVS
      let fs_source = basicFS
      let headShader_vs = [`#version 300 es`]
      let headShader_fs = [
        `#version 300 es
         precision highp float;`
      ]

      // 全局效果的define依赖收集
      // 是否启用shadowMap
      if (engine.isShowShadow && this.isReceiveShadow) {
        this.defines.push('#define SHADOW_MAP')
        if (engine.shadowMapComponent.type === 'CSM') {
          this.defines.push('#define CASCADED_SHADOW_MAP')
          this.defines.push(
            `#define SHADOWCSMNUM_CASCADES ${engine.shadowMapComponent.cascadesNum}`
          )
        } else {
          if (engine.shadowMapComponent.sample === 'POISSON') {
            this.defines.push('#define POISSON_SAMPLE')
          } else if (engine.shadowMapComponent.sample === 'PCF') {
            this.defines.push('#define PCF_SAMPLE')
          } else if (engine.shadowMapComponent.sample === 'PCSS') {
            this.defines.push('#define PCSS_SAMPLE')
          } else {
            this.defines.push('#define DEFAULT_SAMPLE')
          }
        }
      }

      // 替换include
      vs_source = this.replaceInclude(vs_source)
      fs_source = this.replaceInclude(fs_source)

      headShader_vs = headShader_vs.concat(this.defines)
      headShader_fs = headShader_fs.concat(this.defines)
      vs_source = headShader_vs.concat(vs_source).join('\n')
      fs_source = headShader_fs.concat(fs_source).join('\n')
      this.program = new Program({
        gl,
        vs: vs_source,
        fs: fs_source
      })
    }
  }
  bindUniform(engine: any, mesh: any) {
    // base_Uniform + material_uniform
    let gl = engine._gl
    let uniformLocations = this.program.uniformLocations
    const mat4array = new Float32Array(16)

    mat4array.set(mesh.worldMatrix.elements)
    gl.uniformMatrix4fv(uniformLocations['u_worldMatrix'], false, mat4array)
    mat4array.set(engine.viewMatrix.elements)
    gl.uniformMatrix4fv(uniformLocations['u_viewMatrix'], false, mat4array)
    mat4array.set(engine.projectionMatrix.elements)
    gl.uniformMatrix4fv(
      uniformLocations['u_projectionMatrix'],
      false,
      mat4array
    )
    let color = mesh.material.colorArray
    let r = color[0]
    let g = color[1]
    let b = color[2]
    let a = color[3]
    gl.uniform4f(uniformLocations['u_color'], r, g, b, a)
  }

  replaceInclude(shader: string): string {
    const includePattern = /^[ \t]*#include +<([\w\d./]+)>/gm
    return shader.replace(includePattern, this.replaceFunction.bind(this))
  }
  replaceFunction(match: string, include: string) {
    const string = ShaderInclude[include]
    return this.replaceInclude(string)
  }
}
