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

import {
  VertexBuffer,
  IndexBuffer,
  VertexArrayObject
} from '../webgl/VertexArrayObject'

import AmbientLight from '../light/AmbientLight'
import Light from '../light/Light'

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

    for (let index = 0; index < this.meshArray.length; index++) {
      const mesh = this.meshArray[index]
      mesh.updateWorldMatrix()
      let worldMatrix = mesh.worldMatrix
      let vs_source = basicVS
      let fs_source = basicFS
      let material = mesh.material
      let defines = []
      // debugger
      if (material.type === 'PhongMaterial') {
        defines.push('#define PHONG_MATERIAL')
      }
      let headShader_vs = [`#version 300 es`]
      let headShader_fs = [
        `#version 300 es
                          precision highp float;`
      ]
      headShader_vs = headShader_vs.concat(defines)
      headShader_fs = headShader_fs.concat(defines)
      vs_source = headShader_vs.concat(vs_source).join('\n')
      fs_source = headShader_fs.concat(fs_source).join('\n')
      mesh.program = new Program({
        gl: this._gl,
        vs: vs_source,
        fs: fs_source
      })

      let { attributesLocations, uniformLocations } = mesh.program
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
      this._gl.useProgram(mesh.program.program)
      mesh.vao = new VertexArrayObject(this._gl)
      mesh.vao.packUp(mesh.vertexBufferArray, mesh.indexBuffer)
      const mat4array = new Float32Array(16)
      // uniforms
      for (let key in uniformLocations) {
        let uniformLocation = uniformLocations[key]
        if (key === 'u_worldMatrix') {
          mat4array.set(worldMatrix.elements)
          this._gl.uniformMatrix4fv(uniformLocation, false, mat4array)
        } else if (key === 'u_viewMatrix') {
          mat4array.set(this.viewMatrix.elements)
          this._gl.uniformMatrix4fv(uniformLocation, false, mat4array)
        } else if (key === 'u_projectionMatrix') {
          mat4array.set(this.projectionMatrix.elements)
          this._gl.uniformMatrix4fv(uniformLocation, false, mat4array)
        } else if (key === 'u_color') {
          let color = mesh.material.colorArray
          let r = color[0]
          let g = color[1]
          let b = color[2]
          let a = color[3]
          this._gl.uniform4f(uniformLocation, r, g, b, a)
        }
        // Phong{部分
        else if (key === 'u_ambientLightStrength' && this.ambientLight) {
          this._gl.uniform1f(uniformLocation, this.ambientLight.intensity)
        } else if (key === 'u_lightColor' && this.light) {
          let color = this.light.colorArray
          let r = color[0]
          let g = color[1]
          let b = color[2]
          this._gl.uniform3f(uniformLocation, r, g, b)
        } else if (key === 'u_lightPosition' && this.light) {
          let lightPosition = this.light.position
          this._gl.uniform3f(
            uniformLocation,
            lightPosition[0],
            lightPosition[1],
            lightPosition[2]
          )
        } else if (key === 'u_cameraPosition' && this.light) {
          let cameraPosition = this.camera.position
          this._gl.uniform3f(
            uniformLocation,
            cameraPosition.x,
            cameraPosition.y,
            cameraPosition.z
          )
        } else if (key === 'u_specularStrength' && this.light) {
          this._gl.uniform1f(uniformLocation, mesh.material.specularStrength)
        } else if (key === 'u_shininess' && this.light) {
          this._gl.uniform1f(uniformLocation, mesh.material.shininess)
        }
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
