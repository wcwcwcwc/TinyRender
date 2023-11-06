/**
 * 反射探针
 * 自由位置下的环境贴图，用以处理PBR流程中的漫反射和高光反射
 */
import Engine from '../engine/Engine'
import Mesh from '../mesh/Mesh'
import { Matrix4 } from '../math/Matrix4'
import { Quaternion } from '../math/Quaternion'
import { Vector3 } from '../math/Vector3'
import SkyBox from '../skyBox/SkyBox'
import TextureCube from '../texture/TextureCube'
import CONSTANTS from '../texture/Constants'

interface ReflectionProbeOptions {
  position: Vector3
  textureSize: number
  renderList: Array<Mesh>
}
export default class ReflectionProbe {
  public engine: Engine
  public renderList: Array<Mesh | SkyBox>
  public position: Vector3 = new Vector3()
  public textureSize: number = 512
  public cubeMapTexture: TextureCube
  public name: string
  public gl: any
  public probeFrameBufferObject: WebGLFramebuffer
  public viewMatrix: Matrix4 = new Matrix4()
  public projectionMatrix: Matrix4 = new Matrix4()
  constructor(
    engine: Engine,
    name: string,
    reflectionProbeOptions: ReflectionProbeOptions
  ) {
    this.engine = engine
    this.name = name || 'reflection-probe0'
    this.renderList =
      (reflectionProbeOptions && reflectionProbeOptions.renderList) || []
    this.position =
      (reflectionProbeOptions && reflectionProbeOptions.position) ||
      new Vector3()
    this.textureSize =
      (reflectionProbeOptions && reflectionProbeOptions.textureSize) || 512
    this.gl = engine._gl
    this.engine.reflectionProbeList.push(this)

    this.createCubeMap()
    this.createFrameBuffer()
    this.updatePerspectiveMatrix()
  }
  /**
   * 构建此probe的cubeMap
   */
  createCubeMap() {
    this.cubeMapTexture = new TextureCube(this.engine, '', {
      width: 512,
      height: 512,
      noMipmap: false,
      unpackFlipY: true,
      wrapS: CONSTANTS.REPEAT,
      wrapT: CONSTANTS.REPEAT
    })
    this.cubeMapTexture.isInvCubic = true
    this.cubeMapTexture.gammaSpace = true
  }
  /**
   * 构建此probe渲染的帧缓冲区
   */
  createFrameBuffer() {
    this.probeFrameBufferObject = this.gl.createFramebuffer()
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.probeFrameBufferObject)
    let depthTexture = this.gl.createTexture()
    this.gl.bindTexture(this.gl.TEXTURE_2D, depthTexture)
    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, false)
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MAG_FILTER,
      this.gl.NEAREST
    )
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MIN_FILTER,
      this.gl.NEAREST
    )
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_S,
      this.gl.CLAMP_TO_EDGE
    )
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_T,
      this.gl.CLAMP_TO_EDGE
    )
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.DEPTH_COMPONENT24,
      512,
      512,
      0,
      this.gl.DEPTH_COMPONENT,
      this.gl.UNSIGNED_INT,
      null
    )
    this.gl.framebufferTexture2D(
      this.gl.FRAMEBUFFER,
      this.gl.DEPTH_ATTACHMENT,
      this.gl.TEXTURE_2D,
      depthTexture,
      0
    )
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)
  }
  /**
   * 添加进渲染队列
   * @param mesh
   */
  addMesh(mesh: Mesh | SkyBox) {
    this.renderList.push(mesh)
  }
  /**
   * 渲染
   */
  render() {
    // 实时更新，脏值
    this.cubeMapTexture.loaded = false

    // 绑定到当前FBO
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.probeFrameBufferObject)

    // cubeMap的各个面
    for (let face = 0; face < 6; face++) {
      let renderList = this.renderList

      // 更新probe下的VP矩阵
      this.engine.viewMatrix = this.updateViewMatrix(face)
      this.engine.projectionMatrix = this.projectionMatrix

      // 是否包含天空盒，天空盒首先渲染
      let skyBoxInProbe = renderList.filter(mesh => mesh instanceof SkyBox)

      this.gl.viewport(0, 0, this.textureSize, this.textureSize)
      this.gl.framebufferTexture2D(
        this.gl.FRAMEBUFFER,
        this.gl.COLOR_ATTACHMENT0,
        this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + face,
        this.cubeMapTexture.webglTexture,
        0
      )
      this.gl.clear(
        this.gl.COLOR_BUFFER_BIT |
          this.gl.DEPTH_BUFFER_BIT |
          this.gl.STENCIL_BUFFER_BIT
      )
      if (
        skyBoxInProbe.length > 0 &&
        this.engine.environmentTexture &&
        this.engine.environmentTexture.loaded
      ) {
        // 天空盒渲染
        this.engine.skyBox.draw()
      }
      // 其他Mesh渲染
      let meshInProbe = renderList.filter(mesh => mesh instanceof Mesh)
      this.engine.draw(meshInProbe as Array<Mesh>)

      // this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)
    }

    // 更新cubeMap，生成mipmap
    this.gl.bindTexture(
      this.gl.TEXTURE_CUBE_MAP,
      this.cubeMapTexture.webglTexture
    )
    this.gl.generateMipmap(this.gl.TEXTURE_CUBE_MAP)
    this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, null)

    // 全部渲染完为贴图true
    this.cubeMapTexture.loaded = true
  }

  /**
   * 根据cubeMap朝向计算VP矩阵
   * @param faceIndex
   */
  updateViewMatrix(faceIndex: number) {
    let add = new Vector3()
    switch (faceIndex) {
      case 0:
        add.set(1, 0, 0)
        break
      case 1:
        add.set(-1, 0, 0)
        break
      case 2:
        add.set(0, -1, 0)
        break
      case 3:
        add.set(0, 1, 0)
        break
      case 4:
        add.set(0, 0, 1)
        break
      case 5:
        add.set(0, 0, -1)
        break
      default:
        break
    }
    let target = new Vector3()
    target.add(this.position)
    target.add(add)
    let up = new Vector3(0, 1, 0)
    let scale = new Vector3(1, 1, 1)
    let quaternion = new Quaternion()
    let lookAtMatrix = new Matrix4()

    lookAtMatrix.lookAt(this.position, target, up)
    quaternion.setFromRotationMatrix(lookAtMatrix)

    this.viewMatrix.compose(this.position, quaternion, scale)
    this.viewMatrix.invert()
    return this.viewMatrix
  }

  /**
   * 计算投影矩阵
   */
  updatePerspectiveMatrix() {
    const near = 1
    let top = near * Math.tan((Math.PI / 180) * 0.5 * 90)
    let height = 2 * top
    let width = height
    let left = -0.5 * width
    this.projectionMatrix.makePerspective(
      left,
      left + width,
      top,
      top - height,
      1,
      10000
    )
    return this.projectionMatrix
  }
}
