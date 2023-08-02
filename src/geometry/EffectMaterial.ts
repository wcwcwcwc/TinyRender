/**
 * 效果材质类
 * 主要解决基于屏幕的效果及纹理的生成，如：
 * 1. irradianceMap的生成
 * 2. PrefilteredEnvironmentMap的生成
 * 3. brdf_lut的生成
 */

import Engine from '../engine/Engine'
import Program from '../webgl/Program'
//@ts-ignore
import effectVS from '../webgl/shaders/effectVS.glsl'
import { ShaderInclude } from '../webgl/shaders/shadersInclude'
import Texture from '../texture/Texture'
import { Attributes } from './Mesh'
import { BufferAttribute } from '../data/BufferAttribute'
import {
  IndexBuffer,
  VertexArrayObject,
  VertexBuffer
} from '../webgl/VertexArrayObject'

interface Uniform {
  [key: string]: number[] | number | Float32Array | Texture
}
interface EffectMaterialOptions {
  name: string
  fragment: any
  vertex?: any
  samplerNames?: Uniform
  uniformNames: Uniform
}
export default class EffectMaterial {
  public fragment: any
  public vertex: any
  public name: string
  public program: Program
  public engine: Engine
  public gl: any
  public samplerNames: Uniform
  public uniformNames: Uniform
  public positions: number[]
  public indices: number[]
  public attributes: Attributes
  public index: BufferAttribute
  public vertexBufferArray: VertexBuffer[]
  public indexBuffer: IndexBuffer
  public vao: VertexArrayObject
  constructor(engine: Engine, options: EffectMaterialOptions) {
    this.engine = engine
    this.gl = engine._gl
    this.name = options.name || 'effect'
    this.fragment = options.fragment
    this.vertex = options.vertex || effectVS
    this.samplerNames = options.samplerNames || {}
    this.uniformNames = options.uniformNames || {}
    this.initProgram(this.gl, this.engine)
    this.initAttributes()
  }
  /**
   * 初始化顶点
   */
  private initAttributes(): void {
    this.positions = [1, 1, -1, 1, -1, -1, 1, -1]
    this.indices = [0, 1, 2, 0, 2, 3]
    this.attributes['a_position'] = new BufferAttribute(
      new Float32Array(this.positions),
      3,
      false
    )
    this.index = new BufferAttribute(new Uint16Array(this.indices), 1, false)
  }
  /**
   * 初始化program
   * @param gl
   * @param engine
   */
  private initProgram(gl: any, engine: any): void {
    if (!this.program) {
      let vs_source = this.vertex
      let fs_source = this.fragment
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
  private replaceInclude(shader: string): string {
    const includePattern = /^[ \t]*#include +<([\w\d./]+)>/gm
    return shader.replace(includePattern, this.replaceFunction.bind(this))
  }
  private replaceFunction(match: string, include: string) {
    const string = ShaderInclude[include]
    return this.replaceInclude(string)
  }
  /**
   * 绑定uniform
   * @param engine
   * @param mesh
   */
  private bindUniform(): void {
    const { camera } = this.engine
    let gl = this.engine._gl
    let uniformLocations = this.program.uniformLocations
    let uniformInfos = this.program.uniformInfos

    for (let key in this.uniformNames) {
      let uniformName = key
      let uniformValue = this.uniformNames[key]
      let uniformLocation = uniformLocations[uniformName]
      let uniformInfo = uniformInfos[uniformName]
      let activeTextureNumber = 0
      if (uniformLocation && uniformInfo) {
        let type = uniformInfo.type
        switch (type) {
          // FLOAT
          case 0x1406:
            if (uniformValue instanceof Number)
              gl.uniform1f(uniformLocation, uniformValue)
            break
          // VEC2
          case 0x8b50:
            if (uniformValue instanceof Array)
              gl.uniform2f(uniformLocation, uniformValue[0], uniformValue[1])
            break
          // VEC3
          case 0x8b51:
            if (uniformValue instanceof Array)
              gl.uniform3f(
                uniformLocation,
                uniformValue[0],
                uniformValue[1],
                uniformValue[2]
              )
            break
          // VEC4
          case 0x8b52:
            if (uniformValue instanceof Array)
              gl.uniform4f(
                uniformLocation,
                uniformValue[0],
                uniformValue[1],
                uniformValue[2],
                uniformValue[2]
              )
            break
          // MAT4
          case 0x8b5c:
            if (uniformValue instanceof Float32Array)
              gl.uniformMatrix4fv(uniformLocation, false, uniformValue)
            break
          // SAMPLER_2D
          case 0x8b5e:
            if (uniformValue instanceof Texture) {
              gl.activeTexture(gl.TEXTURE0 + activeTextureNumber)
              gl.bindTexture(gl.TEXTURE_2D, uniformValue.webglTexture)
              gl.uniform1i(uniformLocation, activeTextureNumber)
              activeTextureNumber++
            }
            break
          // SAMPLER_CUBE
          case 0x8b60:
            if (uniformValue instanceof Texture) {
              gl.activeTexture(gl.TEXTURE0 + activeTextureNumber)
              gl.bindTexture(gl.TEXTURE_CUBE_MAP, uniformValue.webglTexture)
              gl.uniform1i(uniformLocation, activeTextureNumber)
              activeTextureNumber++
            }
            break
          default:
            break
        }
      }
    }
  }
  /**
   * vao绑定
   */
  private bindVao(): void {
    let { attributesLocations, uniformLocations } = this.program
    let vertexBuffer = new VertexBuffer(
      this.gl,
      this.attributes['a_position'],
      attributesLocations['a_position'],
      false
    )
    this.attributes['a_position'].vertexBuffer = vertexBuffer
    this.vertexBufferArray.push(vertexBuffer)
    this.indexBuffer = new IndexBuffer(this.gl, this.index, false)
    this.gl.useProgram(this.program.program)
    this.vao = new VertexArrayObject(this.gl)
    this.vao.packUp(this.vertexBufferArray, this.indexBuffer)
  }
  /**
   * 更新uniform
   * @param uniform
   */
  public updateUniform(uniform: Uniform) {
    this.uniformNames = {
      ...uniform
    }
  }
  /**
   * 渲染
   */
  public render(): void {
    this.bindVao()
    this.bindUniform()
    this.vao.bind()
    this.gl.enable(this.gl.DEPTH_TEST)
    this.gl.depthFunc(this.gl.LEQUAL)
    this.gl.depthMask(true)
    this.gl.disable(this.gl.CULL_FACE)
    this.gl.disable(this.gl.BLEND)

    this.gl.drawElements(
      this.gl.TRIANGLES,
      this.indexBuffer.count,
      this.gl.UNSIGNED_SHORT,
      0
    )
    this.vao.unbind()
  }
}
