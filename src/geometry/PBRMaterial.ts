import Material from './Material'
import HDRCubeTexture from '../texture/HDRCubeTexture'
import Texture from '../texture/Texture'
//@ts-ignore
import pbrFS from '../webgl/shaders/pbrFS.glsl'
//@ts-ignore
import pbrVS from '../webgl/shaders/pbrVS.glsl'
//@ts-ignore
import irradianceMapFS from '../webgl/shaders/irradianceMapFS.glsl'
//@ts-ignore
import prefilteredEnvironmentMapFS from '../webgl/shaders/prefilteredEnvironmentMapFS.glsl'
//@ts-ignore
import blitCubeFS from '../webgl/shaders/blitCubeFS.glsl'
import Program from '../webgl/Program'
import { Color3, Color4 } from '../math/Color'
import TextureCube from '../texture/TextureCube'
import Engine from '../engine/Engine'
import EffectMaterial from './EffectMaterial'

// 该类默认金属工作流

interface PBRMaterialOptions {
  baseColor: Color4
  baseColorTexture: Texture
  metallic: number
  roughness: number
  metallicRoughnessTexture: Texture
  reflectionTexture: HDRCubeTexture
  environmentBRDFTexture: Texture
  ambientColor: Color3
  emissiveColor: Color3
  directIntensity: number
  emissiveIntensity: number
  environmentIntensity: number
  specularIntensity: number
  reflectionColor: Color3
  irradianceMapEnabled: boolean
}

export default class PBRMaterial extends Material {
  public baseColor: Color4
  public baseColorTexture: Texture
  public metallic: number
  public roughness: number
  public metallicRoughnessTexture: Texture
  public reflectionTexture: HDRCubeTexture
  public environmentBRDFTexture: Texture
  public metallicF0Factor: number = 1
  public f0: number = 0.04
  public f90: number = 1
  public reflectionColor: Color3 = new Color3(1, 1, 1)
  public ambientColor: Color3 = new Color3(0, 0, 0)
  public emissiveColor = new Color3(0, 0, 0)
  public directIntensity: number = 1.0
  public emissiveIntensity: number = 1.0
  public environmentIntensity: number = 1.0
  public specularIntensity: number = 1.0
  public irradianceMapTexture: TextureCube
  public prefilteredEnvironmentMapTexture: TextureCube
  public gl: any
  public engine: Engine
  public effectFrameBufferObject: WebGLFramebuffer
  public effecter: EffectMaterial
  public prefilteredEnvironmentMapEffecter: EffectMaterial
  public blitIrradianceMapEffecter: EffectMaterial

  private _irradianceMapEnabled: boolean = false
  private _prefilteredEnvironmentMapEnabled: boolean = false
  private readonly _lodGenerationOffset = 0
  private readonly _lodGenerationScale = 0.8
  public effectPrefilteredFrameBufferObject: WebGLFramebuffer

  constructor(engine: Engine, options: PBRMaterialOptions) {
    super({
      color: options.baseColor.toString()
    })
    this.baseColor = options.baseColor
    this.baseColorTexture = options.baseColorTexture
    this.metallic =
      options.metallic === undefined || options.metallic === null
        ? 1
        : options.metallic
    this.roughness =
      options.roughness === undefined || options.roughness === null
        ? 1
        : options.roughness
    this.metallicRoughnessTexture = options.metallicRoughnessTexture
    this.reflectionTexture = options.reflectionTexture
    this.environmentBRDFTexture = options.environmentBRDFTexture
    // 默认实时计算漫反射部分，不采用irradianceMap预计算
    this.irradianceMapEnabled = options.irradianceMapEnabled || false
    this.engine = engine
    this.gl = engine._gl
  }

  /**
   * 是否开启prefilteredEnvironmentMap
   */
  public get prefilteredEnvironmentMapEnabled(): boolean {
    return this._prefilteredEnvironmentMapEnabled
  }
  /**
   * 设置是否开启prefilteredEnvironmentMap
   */
  public set prefilteredEnvironmentMapEnabled(value: boolean) {
    this._prefilteredEnvironmentMapEnabled = value
    if (value) {
      // 环境贴图未加载时，需要添加进贴图完成回调中
      if (!this.reflectionTexture.loaded) {
        this.reflectionTexture.addLoadedCallback(
          this.createPrefilteredEnvironmentMap.bind(this)
        )
      } else {
        //环境贴图加载完成，直接生成irradianceMap
        this.createPrefilteredEnvironmentMap()
      }
    }
  }

  /**
   * 是否开启irradianceMap
   */
  public get irradianceMapEnabled(): boolean {
    return this._irradianceMapEnabled
  }
  /**
   * 设置是否开启irradianceMap
   */
  public set irradianceMapEnabled(value: boolean) {
    this._irradianceMapEnabled = value
    if (value) {
      // 环境贴图未加载时，需要添加进贴图完成回调中
      if (!this.reflectionTexture.loaded) {
        this.reflectionTexture.addLoadedCallback(
          this.createIrradianceMap.bind(this)
        )
      } else {
        //环境贴图加载完成，直接生成irradianceMap
        this.createIrradianceMap()
      }
    }
  }

  /**
   * 生成irradianceMap
   * 1. 创建FBO
   * 2. 创建irradianceMap cubeMap
   * 3. 遍历6个面，绑定FBO的纹理
   * 4. 根据面，计算法向量
   * 5. 多次采样取平均计算irradianceMap
   */
  private createIrradianceMap() {
    if (!this.irradianceMapTexture) {
      // todo:合并到FrameBufferObject.js中
      if (!this.effectFrameBufferObject) {
        this.effectFrameBufferObject = this.gl.createFramebuffer()
      }

      // 绑定到当前FBO
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.effectFrameBufferObject)

      // 创建irradianceMap cubeMap
      if (!this.irradianceMapTexture) {
        this.irradianceMapTexture = new TextureCube(this.engine, '', {
          width: 512,
          height: 512,
          noMipmap: false
        })
      }
      const textureWidth = this.irradianceMapTexture.width
      const mipmapsCount = Math.round(Math.log(textureWidth) * Math.LOG2E)

      // 创建基于屏幕的纹理贴图材质
      if (!this.effecter) {
        this.effecter = new EffectMaterial(this.engine, {
          name: 'irradianceMap',
          fragment: irradianceMapFS,
          uniformNames: {
            u_face: 0,
            u_reflectionSampler: this.reflectionTexture,
            u_textureInfo: [textureWidth, mipmapsCount]
          }
        })
      }

      for (let face = 0; face < 6; face++) {
        // this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.effectFrameBufferObject)
        this.gl.viewport(0, 0, textureWidth, textureWidth)

        // console.log(this.irradianceMapTexture.webglTexture)
        this.gl.framebufferTexture2D(
          this.gl.FRAMEBUFFER,
          this.gl.COLOR_ATTACHMENT0,
          this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + face,
          this.irradianceMapTexture.webglTexture,
          0
        )
        // 更新uniform
        this.effecter.updateUniform({
          u_face: face
        })
        // 渲染
        this.effecter.render()
      }
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)
      this.irradianceMapTexture.loaded = true

      // blit mode
      // blit仅用作测试 ================================================================

      // if (!this.blitIrradianceMapEffecter) {
      //   this.blitIrradianceMapEffecter = new EffectMaterial(this.engine, {
      //     name: 'irradianceMapBlit',
      //     fragment: blitCubeFS,
      //     uniformNames: {
      //       u_lod: 0,
      //       u_textureSampler: this.irradianceMapTexture,
      //       u_reflectionSampler: this.reflectionTexture,
      //     }
      //   })
      // }
      // this.gl.viewport(0, 0, 2048, 2048)
      // this.blitIrradianceMapEffecter.render()
      //  =============================================================================
    }
  }

  /**
   * 生成prefilteredEnvironmentMap，用于渲染方程镜面反射部分的前半部分积分
   * 根据粗糙度设置lod，因为每个粗糙度对应的法向量分布函数不一样
   * 1. 创建FBO
   * 2. 创建prefilteredEnvironmentMap cubeMap
   * 3. 遍历6个面，每个lod，绑定FBO的纹理
   * 4. 根据面，计算法向量
   * 5. 根据粗糙度，多次采样取平均计算irradianceMap
   */
  private createPrefilteredEnvironmentMap() {
    if (!this.prefilteredEnvironmentMapTexture) {
      // todo:合并到FrameBufferObject.js中
      if (!this.effectPrefilteredFrameBufferObject) {
        this.effectPrefilteredFrameBufferObject = this.gl.createFramebuffer()
      }

      // 绑定到当前FBO
      this.gl.bindFramebuffer(
        this.gl.FRAMEBUFFER,
        this.effectPrefilteredFrameBufferObject
      )

      // 创建prefilteredEnvironmentMap cubeMap
      if (!this.prefilteredEnvironmentMapTexture) {
        this.prefilteredEnvironmentMapTexture = new TextureCube(
          this.engine,
          '',
          {
            width: 512,
            height: 512,
            noMipmap: false
          }
        )
      }
      const textureWidth = this.prefilteredEnvironmentMapTexture.width
      const mipmapsCount = Math.round(Math.log(textureWidth) * Math.LOG2E)

      // 创建基于屏幕的纹理贴图材质
      if (!this.prefilteredEnvironmentMapEffecter) {
        this.prefilteredEnvironmentMapEffecter = new EffectMaterial(
          this.engine,
          {
            name: 'prefilteredEnvironmentMap',
            fragment: prefilteredEnvironmentMapFS,
            uniformNames: {
              u_reflectionSampler: this.reflectionTexture,
              u_textureInfo: [textureWidth, mipmapsCount]
            }
          }
        )
      }

      for (let face = 0; face < 6; face++) {
        for (let lod = 0; lod < mipmapsCount + 1; lod++) {
          // 视口大小根据lod计算
          this.gl.viewport(
            0,
            0,
            textureWidth * Math.pow(0.5, lod),
            textureWidth * Math.pow(0.5, lod)
          )
          this.gl.framebufferTexture2D(
            this.gl.FRAMEBUFFER,
            this.gl.COLOR_ATTACHMENT0,
            this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + face,
            this.prefilteredEnvironmentMapTexture.webglTexture,
            lod
          )
          let alpha =
            Math.pow(
              2,
              (lod - this._lodGenerationOffset) / this._lodGenerationScale
            ) / textureWidth
          if (lod === 0) {
            alpha = 0
          }
          // 更新uniform
          this.prefilteredEnvironmentMapEffecter.updateUniform({
            u_face: face,
            u_linearRoughness: alpha
          })
          // 渲染
          this.prefilteredEnvironmentMapEffecter.render()
        }
      }
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)
      this.prefilteredEnvironmentMapTexture.loaded = true

      // blit mode
      // blit仅用作测试 ================================================================

      // if (!this.blitIrradianceMapEffecter) {
      //   this.blitIrradianceMapEffecter = new EffectMaterial(this.engine, {
      //     name: 'irradianceMapBlit',
      //     fragment: blitCubeFS,
      //     uniformNames: {
      //       u_lod: 5,
      //       u_textureSampler: this.prefilteredEnvironmentMapTexture,
      //       u_reflectionSampler: this.reflectionTexture,
      //     }
      //   })
      // }
      // this.gl.viewport(0, 0, 2048, 2048)
      // this.blitIrradianceMapEffecter.render()
      //  =============================================================================
    }
  }
  public isReadyToDraw() {
    if (!this.reflectionTexture.loaded) {
      return false
    }

    if (!this.environmentBRDFTexture.loaded) {
      return false
    }

    if (this._irradianceMapEnabled && !this.irradianceMapTexture.loaded) {
      return false
    }

    if (
      this._prefilteredEnvironmentMapEnabled &&
      !this.prefilteredEnvironmentMapTexture.loaded
    ) {
      return false
    }
    return true
  }
  public initProgram(gl: any, engine: any) {
    if (!this.program) {
      this.defines = []
      let vs_source = pbrVS
      let fs_source = pbrFS
      let headShader_vs = [`#version 300 es`]
      let headShader_fs = [
        `#version 300 es
               precision highp float;`
      ]
      vs_source = this.replaceInclude(vs_source)
      fs_source = this.replaceInclude(fs_source)

      if (this._irradianceMapEnabled) {
        this.defines.push('#define IRRADIANCEMAP_ENABLED')
      }
      if (this._prefilteredEnvironmentMapEnabled) {
        this.defines.push('#define PREFILTEREDENVIRONMENTMAP_ENABLED')
      }

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

  public bindUniform(engine: any, mesh: any): void {
    super.bindUniform(engine, mesh)
    const { camera } = engine
    let gl = engine._gl
    let uniformLocations = this.program.uniformLocations
    for (let key in uniformLocations) {
      let uniformLocation = uniformLocations[key]
      if (key === 'u_eyePosition') {
        let cameraPosition = camera.position
        gl.uniform3f(
          uniformLocation,
          cameraPosition.x,
          cameraPosition.y,
          cameraPosition.z
        )
      }
      if (key === 'u_baseColor') {
        let color = mesh.material.colorArray
        let r = color[0]
        let g = color[1]
        let b = color[2]
        let a = color[3]
        gl.uniform4f(uniformLocation, r, g, b, a)
      }

      if (key === 'u_reflectivitySampler') {
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(
          gl.TEXTURE_2D,
          this.metallicRoughnessTexture.webglTexture
        )
        gl.uniform1i(uniformLocation, 0)
      }
      if (key === 'u_environmentBrdfSampler') {
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, this.environmentBRDFTexture.webglTexture)
        gl.uniform1i(uniformLocation, 1)
      }
      if (key === 'u_reflectionSampler') {
        gl.activeTexture(gl.TEXTURE2)
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.reflectionTexture.webglTexture)
        gl.uniform1i(uniformLocation, 2)
      }
      if (key === 'u_irradianceMapSampler') {
        gl.activeTexture(gl.TEXTURE3)
        gl.bindTexture(
          gl.TEXTURE_CUBE_MAP,
          this.irradianceMapTexture.webglTexture
        )
        gl.uniform1i(uniformLocation, 3)
      }
      if (key === 'u_prefilteredEnvironmentMapSampler') {
        gl.activeTexture(gl.TEXTURE4)
        gl.bindTexture(
          gl.TEXTURE_CUBE_MAP,
          this.prefilteredEnvironmentMapTexture.webglTexture
        )
        gl.uniform1i(uniformLocation, 4)
      }
      if (key === 'u_metallicReflectanceFactors') {
        gl.uniform4f(uniformLocation, this.f0, this.f0, this.f0, this.f90)
      }
      if (key === 'u_reflectivityColor') {
        gl.uniform4f(uniformLocation, this.metallic, this.roughness, this.f0, 1)
      }
      if (key === 'u_reflectionMicrosurfaceInfos') {
        gl.uniform3f(
          uniformLocation,
          this.reflectionTexture.width,
          this._lodGenerationScale,
          this._lodGenerationOffset
        )
      }
      if (key === 'u_reflectionColor') {
        gl.uniform3f(
          uniformLocation,
          this.reflectionColor.r,
          this.reflectionColor.g,
          this.reflectionColor.b
        )
      }
      if (key === 'u_reflectionMatrix') {
        const mat4array = new Float32Array(16)
        mat4array.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
        gl.uniformMatrix4fv(uniformLocation, false, mat4array)
      }
      if (key === 'u_reflectionFilteringInfo') {
        gl.uniform2f(
          uniformLocation,
          this.reflectionTexture.width,
          Math.log(this.reflectionTexture.width) * Math.LOG2E
        )
      }
      if (key === 'u_ambientColor') {
        gl.uniform3f(
          uniformLocation,
          this.ambientColor.r,
          this.ambientColor.g,
          this.ambientColor.b
        )
      }
      if (key === 'u_emissiveColor') {
        gl.uniform3f(
          uniformLocation,
          this.emissiveColor.r,
          this.emissiveColor.g,
          this.emissiveColor.b
        )
      }
      if (key === 'u_lightingIntensity') {
        gl.uniform4f(
          uniformLocation,
          this.directIntensity,
          this.emissiveIntensity,
          this.environmentIntensity,
          this.specularIntensity
        )
      }
    }
  }
}
