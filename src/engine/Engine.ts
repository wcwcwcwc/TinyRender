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

  setExtension() {
    this._gl.getExtension('WEBGL_depth_texture')
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
    // program初始化完成
    // vao的绑定
    if (mesh.material) {
      mesh.material.initProgram(this._gl)
    }
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
        this._gl,
        this.width,
        this.height,
        shadowOptions
      )
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
    this.lightProjectionMatrix = this.projectionMatrix // 默认点光源采用和相机一样的透视投影矩阵
    this.draw()
  }
  draw() {
    for (let index = 0; index < this.meshArray.length; index++) {
      const mesh = this.meshArray[index]
      mesh.updateWorldMatrix()
      let material = mesh.material
      let program = material.program
      if (!program) continue

      let { attributesLocations } = program
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

      // 绑定uniform
      material.bindUniform(this, mesh)

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
