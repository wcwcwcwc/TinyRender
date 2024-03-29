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
  light: any
  constructor(gl: any, width: number, height: number) {
    super({
      color: 'rgba(1.0,1.0,1.0,1.0)',
      opacity: 1
    })
    // this.fbo = new FrameBufferObject({ gl, width, height })
  }
  // 第一次pass的program
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
    const { light, bias, normalBias } = engine.shadowMapComponent
    // base_Uniform + material_uniform
    let gl = engine._gl
    let uniformLocations = this.program.uniformLocations
    const mat4array = new Float32Array(16)

    mat4array.set(mesh.worldMatrix.elements)
    gl.uniformMatrix4fv(uniformLocations['u_worldMatrix'], false, mat4array)
    // 相机位置视图矩阵
    mat4array.set(engine.lightViewMatrix.elements)
    gl.uniformMatrix4fv(uniformLocations['u_viewMatrix'], false, mat4array)
    mat4array.set(engine.lightProjectionMatrix.elements)
    gl.uniformMatrix4fv(
      uniformLocations['u_projectionMatrix'],
      false,
      mat4array
    )
    let lightPosition = light.position
    gl.uniform3f(
      uniformLocations['u_lightPosition'],
      lightPosition[0],
      lightPosition[1],
      lightPosition[2]
    )

    // 归一化[0, 1]。gl_Position.z可能因为bias超过1，因此需要归一化
    // 平行光采用正交矩阵，depthValue.x = 1.0，depthValue.y = 2.0，归一化为[0，1]
    // 点光源采用透视矩阵，depthValue.x = nearZ，depthValue.y = nearZ + farZ，归一化为[0，1]
    if (light.type === 'SpotLight') {
      gl.uniform2f(
        uniformLocations['u_depthValue'],
        light.nearZ,
        light.nearZ + light.farZ
      )
    } else if (light.type === 'DirectionLight') {
      gl.uniform2f(uniformLocations['u_depthValue'], 1, 2)
    }
    gl.uniform2f(uniformLocations['u_biasAndScale'], bias, normalBias)
    let color = mesh.material.colorArray
    let r = color[0]
    let g = color[1]
    let b = color[2]
    let a = color[3]
    gl.uniform4f(uniformLocations['u_color'], r, g, b, a)
  }

  // pass2:shadowMap相关uniform
  bindShadowMapUniform(engine: any, uniformLocations: any) {
    const {
      light,
      bias,
      normalBias,
      fbo,
      sample,
      PCSSSearchRadius,
      PCSSFilterRadius,
      type
    } = engine.shadowMapComponent
    let gl = engine._gl
    const mat4array = new Float32Array(16)
    mat4array.set(engine.lightViewMatrix.elements)
    gl.uniformMatrix4fv(uniformLocations['u_lightViewMatrix'], false, mat4array)

    mat4array.set(engine.lightProjectionMatrix.elements)
    gl.uniformMatrix4fv(
      uniformLocations['u_lightProjectionMatrix'],
      false,
      mat4array
    )
    if (light.type === 'SpotLight') {
      gl.uniform2f(
        uniformLocations['u_depthValue'],
        light.nearZ,
        light.nearZ + light.farZ
      )
    } else if (light.type === 'DirectionLight') {
      gl.uniform2f(uniformLocations['u_depthValue'], 1, 2)
    }
    let textureWidth = fbo.width
    let textureHeight = fbo.height
    gl.uniform4f(
      uniformLocations['u_shadowMapSizeAndInverse'],
      textureWidth,
      textureHeight,
      1 / textureWidth,
      1 / textureHeight
    )
    if (sample === 'PCSS') {
      // gl.uniform1f(uniformLocations['u_lightSizeUV'], 37.68)
      gl.uniform1f(uniformLocations['u_searchRadius'], PCSSSearchRadius)
      gl.uniform1f(uniformLocations['u_filterRadius'], PCSSFilterRadius)
    }

    if (type === 'CSM') {
      gl.uniformMatrix4fv(
        uniformLocations['u_lightMatrix'],
        false,
        engine.shadowMapComponent._transformMatricesAsArray
      )
      gl.uniform1fv(
        uniformLocations['u_viewFrustumZ'],
        engine.shadowMapComponent._viewSpaceFrustumsZ
      )
      gl.uniform1fv(
        uniformLocations['u_frustumLengths'],
        engine.shadowMapComponent._frustumLengths
      )
      gl.uniform1f(uniformLocations['u_cascadeBlendFactor'], 10)

      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, fbo.colorTexture)
      gl.uniform1i(uniformLocations['u_shadowMap'], 0)

      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, fbo.depthTexture)
      gl.uniform1i(uniformLocations['u_shadowMapDepth'], 1)
    } else {
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, fbo.colorTexture)
      gl.uniform1i(uniformLocations['u_shadowMap'], 0)

      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, fbo.depthTexture)
      gl.uniform1i(uniformLocations['u_shadowMapDepth'], 1)
    }
  }
}
