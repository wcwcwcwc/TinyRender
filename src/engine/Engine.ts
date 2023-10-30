import PerspectiveCamera, {
  IPerspectiveCamera
} from '../camera/PerspectiveCamera'
import Mesh from '../mesh/Mesh'
import { Matrix4 } from '../math/Matrix4'
import {
  VertexBuffer,
  IndexBuffer,
  VertexArrayObject
} from '../webgl/VertexArrayObject'

import AmbientLight from '../light/AmbientLight'
import Light from '../light/Light'
import ShadowMapComponent from '../light/shadows/ShadowMapComponent'
import _ from 'lodash'
import CascadedShadowMapComponentComponent from '../light/shadows/CascadedShadowMapComponent'
import Texture from '../texture/Texture'
import HDRCubeTexture from '../texture/HDRCubeTexture'
import SkyBoxMaterial from '../material/SkyBoxMaterial'
import SkyBox from '../skyBox/SkyBox'
import ReflectionProbe from '../light/ReflectionProbe'

type Nullable<T> = T | null
// render构造函数参数接口
interface IRenderOptions {
  // webgl DOM的id
  container: string
}
export default class Engine {
  public container: string
  public _gl: any
  public canvas: any
  public _webGLVersion = 2.0
  public _shaderPlatformName = 'WEBGL2'
  public width: number
  public height: number
  public camera: any
  public meshArray: Array<Mesh> = []
  public projectionMatrix: Matrix4
  public projectionMatrixInverse: Matrix4
  public viewMatrix: Matrix4
  public ambientLight: AmbientLight
  public light: Light
  public lightViewMatrix: Matrix4
  public lightProjectionMatrix: Matrix4
  public isShowShadow: boolean = false
  public enableCascadedShadowMap: boolean = false
  public shadowMapComponent: ShadowMapComponent
  public environmentTexture: HDRCubeTexture
  public skyBox: SkyBox
  public reflectionProbeList: Array<ReflectionProbe>

  constructor(options: IRenderOptions) {
    this.container = options.container
    this.setup()
    this.width = this.canvas.clientWidth * this.devicePixelRatio || 400
    this.height = this.canvas.clientHeight * this.devicePixelRatio || 300
    this.canvas.width = this.width
    this.canvas.height = this.height
    this.resize()
    this.setExtension()
  }

  // 屏幕像素比
  get devicePixelRatio() {
    return window.devicePixelRatio
  }

  setExtension() {
    // 使得RGBA32F支持renderable
    this._gl.getExtension('EXT_color_buffer_float')
    // 使得RGBA32F支持filterable
    this._gl.getExtension('OES_texture_float_linear')
  }

  // 初始化gl
  setup() {
    this.canvas = document.getElementById(this.container)
    this._gl = <any>(
      (this.canvas.getContext('webgl2') ||
        this.canvas.getContext('experimental-webgl2'))
    )
    if (this._gl) {
      this._webGLVersion = 2.0
      this._shaderPlatformName = 'WEBGL2'
    }
    if (!this._gl) {
      if (!this.canvas) {
        throw new Error('The provided canvas is null or undefined.')
      }
      try {
        this._gl = <WebGL2RenderingContext>(
          (this.canvas.getContext('webgl') ||
            this.canvas.getContext('experimental-webgl'))
        )
      } catch (e) {
        throw new Error('WebGL not supported')
      }
    }

    if (!this._gl) {
      throw new Error('WebGL not supported')
    }
  }
  // 初始化gl尺寸，清除缓冲区
  resize() {
    this._gl.viewport(0, 0, this.width, this.height)
    this._gl.clearColor(0.85, 0.85, 0.85, 1.0)
    this._gl.clear(this._gl.COLOR_BUFFER_BIT)
    this._gl.clear(this._gl.DEPTH_BUFFER_BIT)
    this._gl.clear(this._gl.STENCIL_BUFFER_BIT)
  }
  // 添加相机
  addCamera(camera: PerspectiveCamera) {
    this.camera = camera
    return this
  }

  addCameraOrbitControls() {
    if (this.camera) {
      this.camera.addCameraOrbitControls(this.canvas)
    }
  }
  // 添加mesh
  addMesh(mesh: Mesh) {
    this.meshArray.push(mesh)
  }

  addAmbientLight(ambientLight: AmbientLight) {
    this.ambientLight = ambientLight
  }

  addLight(light: Light) {
    // TODO 多光源
    this.light = light
  }

  /**
   *
   * @param isShowShadow 是否显示阴影
   * @param shadowOptions 阴影相关参数
   */
  addShadow(isShowShadow: boolean, shadowOptions: any) {
    if (isShowShadow) {
      this.isShowShadow = isShowShadow
      if (shadowOptions.enableCascadedShadowMap) {
        this.enableCascadedShadowMap = true
        shadowOptions.layers = shadowOptions.cascadesNum || 4
        this.shadowMapComponent = new CascadedShadowMapComponentComponent(
          this,
          2048,
          2048,
          shadowOptions
        )
      } else {
        this.shadowMapComponent = new ShadowMapComponent(
          this._gl,
          2048,
          2048,
          shadowOptions
        )
      }
    } else {
      this.isShowShadow = false
      this.enableCascadedShadowMap = false
    }
  }

  /**
   * 添加天空盒
   * @param environmentTexture 天空盒hdr贴图
   */
  addSkyBox(environmentTexture: HDRCubeTexture) {
    this.environmentTexture = environmentTexture
    if (!this.skyBox) {
      this.skyBox = new SkyBox(this, this.environmentTexture)
    }
  }

  /**
   * 重置灯光矩阵
   */
  resetLightMatrix() {
    this.lightViewMatrix = this.light.setViewMatrix()
  }

  /**渲染
   * mvp矩阵计算
   * attributes
   * uniforms
   * drawCall
   */
  render() {
    this.resize()
    this.viewMatrix = this.camera.setViewMatrix()
    this.projectionMatrix = this.camera.camera.projectionMatrix
    this.projectionMatrixInverse = this.camera.camera.projectionMatrixInverse
    if (this.light) {
      this.resetLightMatrix()
      this.lightProjectionMatrix = this.light.getProjectionMatrix() // 默认点光源采用和相机一样的透视投影矩阵
    }

    // Todo:归为 BeforeDraw 流程 ：处理renderTarget事项；
    // renderTarget事项: 1、shadowMap深度图准备
    //                  2、反射探针环境贴图准备
    if (this.isShowShadow) {
      //bindFBO....
      this.shadowMapComponent.fbo.setCurrentFrameBufferObject()
      // this.shadowMapComponent.fbo.resize()
      this.shadowMapComponent.pass = 1
      // CSM
      if (
        this.shadowMapComponent instanceof CascadedShadowMapComponentComponent
      ) {
        if (this.light.lightNeedUpdate) {
          this.shadowMapComponent.computeLightMatrices()
          this.light.lightNeedUpdate = false
        }
        // 遍历视锥体分段数，改变灯光矩阵进行逐次绘制
        for (
          let index = 0;
          index < this.shadowMapComponent.cascadesNum;
          index++
        ) {
          this.lightViewMatrix = this.shadowMapComponent._viewMatrices[index]
          this.lightProjectionMatrix = this.shadowMapComponent._projectionMatrices[
            index
          ]
          this._gl.framebufferTextureLayer(
            this._gl.FRAMEBUFFER,
            this._gl.COLOR_ATTACHMENT0,
            this.shadowMapComponent.fbo.colorTexture,
            0,
            index
          )
          this._gl.framebufferTextureLayer(
            this._gl.FRAMEBUFFER,
            this._gl.DEPTH_ATTACHMENT,
            this.shadowMapComponent.fbo.depthTexture,
            0,
            index
          )
          this.shadowMapComponent.fbo.viewport()
          this._gl.clear(this._gl.DEPTH_BUFFER_BIT)
          this.draw()
        }
      } else {
        this.shadowMapComponent.fbo.resize()
        this.draw()
      }
      this.resetLightMatrix()
      this.shadowMapComponent.pass = 2
      this.shadowMapComponent.fbo.setNullFrameBufferObject()
      this.resize()
    }

    // todo beforeRender:如探针下的渲染列表在内的前置渲染
    if (this.reflectionProbeList && this.reflectionProbeList.length > 0) {
      for (let index = 0; index < this.reflectionProbeList.length; index++) {
        const reflectionProbe = this.reflectionProbeList[index]
        reflectionProbe.render()
      }
      // 还原FBO
      this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, null)

      // 还原VP矩阵
      this.viewMatrix = this.camera.setViewMatrix()
      this.projectionMatrix = this.camera.camera.projectionMatrix
    }

    if (this.environmentTexture && this.environmentTexture.loaded) {
      // 天空盒渲染
      this.skyBox.draw()
    }
    this.draw()
  }
  draw(onlyRenderMeshArray?: Array<Mesh>) {
    let renderList = onlyRenderMeshArray ? onlyRenderMeshArray : this.meshArray

    for (let index = 0; index < renderList.length; index++) {
      const mesh = renderList[index]
      mesh.updateWorldMatrix()
      let material

      if (
        this.isShowShadow &&
        this.shadowMapComponent.pass === 1 &&
        mesh.userData &&
        mesh.userData['isLight']
      ) {
        continue
      }
      // shadowMap：第一次pass，走shadowMapMaterial
      if (this.isShowShadow && this.shadowMapComponent.pass === 1) {
        material = this.shadowMapComponent.material
        this.shadowMapComponent.material.initProgram(this._gl, this)
      } else {
        material = mesh.material
        material.initProgram(this._gl, this)
      }

      let program = material.program
      if (!program) continue

      let { attributesLocations, uniformLocations } = program
      let attributes = mesh.attributes
      // TODO
      // render前完成bufferData
      for (let key in attributesLocations) {
        let bufferAttribute = attributes[key]
        let attributeLocation = attributesLocations[key]
        if (attributes[key]) {
          let vertexBuffer = new VertexBuffer(
            this._gl,
            bufferAttribute,
            attributeLocation,
            false
          )
          bufferAttribute.vertexBuffer = vertexBuffer
          mesh.vertexBufferArray.push(vertexBuffer)
        }
      }
      mesh.indexBuffer = new IndexBuffer(this._gl, mesh.index, false)
      this._gl.useProgram(program.program)
      mesh.vao = new VertexArrayObject(this._gl)
      mesh.vao.packUp(mesh.vertexBufferArray, mesh.indexBuffer)
      if (material.isReadyToDraw()) {
        // uniform = base_uniform + material_uniform + effect_uniform
        // base_uniform: 通用uniform,在基类material完成，包括了如MVP、color在内的通用uniform
        // material_uniform: 材质类uniform，在子类material完成，如phong材质中的specularStrength、shininess等
        // effect_uniform: 效果类uniform，在效果子类material完成，如shadowMap中的lightMatrix等
        // 绑定uniform：base_uniform + material_uniform
        material.bindUniform(this, mesh)
        // 效果类uniform绑定：shadowMap
        if (this.isShowShadow && this.shadowMapComponent.pass === 2) {
          this.shadowMapComponent.material.bindShadowMapUniform(
            this,
            uniformLocations
          )
        }

        // draw
        mesh.vao.bind()
        this._gl.enable(this._gl.DEPTH_TEST)
        this._gl.depthFunc(this._gl.LEQUAL)
        if (mesh.material.opacity === 1) {
          this._gl.depthMask(true)
        } else {
          this._gl.depthMask(false)
        }

        this._gl.drawElements(
          this._gl.TRIANGLES,
          mesh.indexBuffer.count,
          this._gl.UNSIGNED_SHORT,
          0
        )
        mesh.vao.unbind()
      }
    }
  }
}
