import { rgbaToArray } from '../math/Common'
import Program from '../webgl/Program'
//@ts-ignore
import basicFS from '../webgl/shaders/basicFS.glsl'
//@ts-ignore
import basicVS from '../webgl/shaders/basicVS.glsl'
export default class Material {
  public type: string
  public color: any
  public opacity: number
  public colorArray: number[]
  public program: Program
  public defines: string[]
  constructor(options: any) {
    const { color, opacity } = options
    this.type = 'Material'
    this.color = color
    this.opacity = opacity
    this.colorArray = rgbaToArray(this.color)
    this.defines = []
  }
  setColor(color: string) {
    this.color = color
    this.colorArray = rgbaToArray(this.color)
  }

  initProgram(gl: any) {
    let vs_source = basicVS
    let fs_source = basicFS
    let headShader_vs = [`#version 300 es`]
    let headShader_fs = [
      `#version 300 es
                        precision highp float;`
    ]
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
}
