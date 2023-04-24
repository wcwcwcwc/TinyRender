// shadowMap材质类，内部定义
import FrameBufferObject from '../webgl/FrameBufferObject'
import Material from './Material'
import Program from '../webgl/Program'
//@ts-ignore
import depthFS from '../webgl/shaders/depthFS.glsl'
//@ts-ignore
import depthVS from '../webgl/shaders/depthVS.glsl'
interface ShadowMapMaterialOptions {}
export default class ShadowMapMaterial extends Material {
  fbo: FrameBufferObject
  pass: number
  constructor(gl: any, width: number, height: number) {
    super({
      color: 'rgba(1.0,1.0,1.0,1.0)',
      opacity: 1
    })
    this.fbo = new FrameBufferObject({ gl, width, height })
  }
  initProgram(gl: any, engine: any) {
    if (!this.program) {
      let vs_source = depthVS
      let fs_source = depthFS
      let headShader_vs = [`#version 300 es`]
      let headShader_fs = [
        `#version 300 es
           precision highp float;`
      ]
      // this.defines =[]
      // headShader_vs = headShader_vs.concat(this.defines)
      // headShader_fs = headShader_fs.concat(this.defines)
      vs_source = headShader_vs.concat(vs_source).join('\n')
      fs_source = headShader_fs.concat(fs_source).join('\n')
      this.program = new Program({
        gl,
        vs: vs_source,
        fs: fs_source
      })
    }
  }
  // pass1:shadowMap相关uniform
  bindUniform(engine: any, mesh: any) {
    // base_Uniform + material_uniform
    let gl = engine._gl
    let uniformLocations = this.program.uniformLocations
    const mat4array = new Float32Array(16)

    mat4array.set(mesh.worldMatrix.elements)
    gl.uniformMatrix4fv(uniformLocations['u_worldMatrix'], false, mat4array)
    // 相机位置视图矩阵
    mat4array.set(engine.lightViewMatrix.elements)
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

  // pass2:shadowMap相关uniform
  bindShadowMapUniform(engine: any, uniformLocations: any) {
    let gl = engine._gl
    const mat4array = new Float32Array(16)
    mat4array.set(engine.lightViewMatrix.elements)
    gl.uniformMatrix4fv(uniformLocations['u_lightMatrix'], false, mat4array)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, engine.shadowMapComponent.fbo.depthTexture)
    gl.uniform1i(uniformLocations['u_shadowMapDepth'], 0)
  }
}
