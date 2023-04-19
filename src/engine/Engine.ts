import PerspectiveCamera, {
  IPerspectiveCamera
} from '../camera/PerspectiveCamera'
import Mesh from '../geometry/Mesh'
import { Matrix4 } from '../math/Matrix4'
import { Vector3 } from '../math/Vector3'
import Program from '../webgl/Program'
//@ts-ignore
import basicFS from '../webgl/shaders/basicFS.glsl'
//@ts-ignore
import basicVS from '../webgl/shaders/basicVS.glsl'

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
  constructor(options: IRenderOptions) {
    this.container = options.container
    this.setup()
    this.width = this.canvas.clientWidth * this.devicePixelRatio || 400
    this.height = this.canvas.clientHeight * this.devicePixelRatio || 300
    this.canvas.width = this.width
    this.canvas.height = this.height
    this.resize()
  }

  // 屏幕像素比
  get devicePixelRatio() {
    return window.devicePixelRatio
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
  addCamera(options: IPerspectiveCamera, cameraPosition: Array<number>) {
    this.camera = new PerspectiveCamera(options, this.canvas)
    this.camera.setPosition(cameraPosition)
    return this
  }
  // 添加mesh
  addMesh(mesh: Mesh) {
    this.meshArray.push(mesh)
  }

  // 渲染
  render() {
    // mvp矩阵计算
    // attributes
    // uniforms
    this.projectionMatrix = this.camera.camera.projectionMatrix
    this.projectionMatrixInverse = this.camera.camera.projectionMatrixInverse
    this.viewMatrix = this.camera.setViewMatrix()

    for (let index = 0; index < this.meshArray.length; index++) {
      const mesh = this.meshArray[index]
      let worldMatrix = mesh.worldMatrix
      let program = new Program({
        gl: this._gl,
        vs: basicVS,
        fs: basicFS
      })
      let { attributesLocations, uniformLocations } = program
      let attributes = mesh.attributes
      for (let key in attributesLocations) {
        if (attributes[key]) {
          //let vertexBuffer =
        }
      }
    }
  }
}
