import PerspectiveCamera, {
  IPerspectiveCamera
} from '../camera/PerspectiveCamera'
import Mesh from '../geometry/Mesh'
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
  public shadowMapComponent: ShadowMapComponent

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

  setExtension() {}

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
      this.shadowMapComponent = new ShadowMapComponent(
        this,
        2048,
        2048,
        shadowOptions
      )
    } else {
      this.isShowShadow = false
    }
  }

  /**渲染
   * mvp矩阵计算
   * attributes
   * uniforms
   * drawCall
   */
  render() {
    this.resize()
    this.projectionMatrix = this.camera.camera.projectionMatrix
    this.projectionMatrixInverse = this.camera.camera.projectionMatrixInverse
    this.viewMatrix = this.camera.setViewMatrix()
    this.lightViewMatrix = this.light.setViewMatrix()
    this.lightProjectionMatrix = this.light.getProjectionMatrix() // 默认点光源采用和相机一样的透视投影矩阵
    if (this.isShowShadow) {
      //bindFBO....
      this.shadowMapComponent.fbo.setCurrentFrameBufferObject()
      this.shadowMapComponent.fbo.resize()
      this.shadowMapComponent.pass = 1
      this.draw()
      this.shadowMapComponent.pass = 2
      this.shadowMapComponent.fbo.setNullFrameBufferObject()
      this.resize()
    }
    this.draw()
  }
  draw() {
    for (let index = 0; index < this.meshArray.length; index++) {
      const mesh = this.meshArray[index]
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
