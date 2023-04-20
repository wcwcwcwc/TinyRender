import * as THREE from 'three'
import { OrbitControls } from 'three-orbitcontrols-ts'
import { Matrix4 } from '../math/Matrix4'
import { Vector3 } from '../math/Vector3'
import { Euler } from '../math/Euler'
import { Quaternion } from '../math/Quaternion'
export interface IPerspectiveCamera {
  fov: number
  aspect: number
  nearZ: number
  farZ: number
}
// 因需要交互插件，这里直接用three封装好的camera类
export default class PerspectiveCamera {
  public canvas: any
  public fov: number
  public aspect: number
  public nearZ: number
  public farZ: number
  public camera: any
  public cameraControls: any
  public scale: any
  public position: Array<number>
  public viewMatrix: any
  public viewMatrixInverse: any
  public target: any
  public up: any
  public rotation: Euler
  public quaternion: Quaternion
  public lookAt: number[]
  constructor(options: IPerspectiveCamera) {
    // this.canvas = canvas
    this.fov = options.fov || 75
    this.aspect = options.aspect || 1
    this.nearZ = options.nearZ || 0.1
    this.farZ = options.farZ || 1000
    this.camera = new THREE.PerspectiveCamera(
      this.fov,
      this.aspect,
      this.nearZ,
      this.farZ
    )
    this.scale = new Vector3(1, 1, 1)
    this.target = new Vector3(0, 0, 0)
    this.up = new Vector3(0, 1, 0)
    this.rotation = new Euler()
    this.quaternion = new Quaternion()
    this.lookAt = [0, 0, 0]
  }
  addCameraOrbitControls(canvas: any) {
    //@ts-ignore
    this.cameraControls = new OrbitControls(this.camera, canvas)
    // this.cameraControls.enableZoom = true
    // this.cameraControls.enableRotate = true
    // this.cameraControls.enablePan = true
    // this.cameraControls.rotateSpeed = 0.3
    // this.cameraControls.zoomSpeed = 1.0
    // this.cameraControls.panSpeed = 2.0
    // this.cameraControls.target.set(0, 0, 0)
  }
  // 设置相机位置
  setPosition(cameraPosition: Array<number>) {
    this.camera.position.set(
      cameraPosition[0],
      cameraPosition[1],
      cameraPosition[2]
    )
    this.position = this.camera.position
  }

  setViewMatrix() {
    // 设定相机看向目标，求出相机自身旋转
    // 相机位置、相机自身旋转、缩放比求出视图矩阵
    let lookAtMatrix = new Matrix4()
    let lookAtVector = new Vector3(
      this.lookAt[0],
      this.lookAt[1],
      this.lookAt[2]
    )
    lookAtMatrix.lookAt(this.position, lookAtVector, this.up)
    this.quaternion.setFromRotationMatrix(lookAtMatrix)

    this.viewMatrix = new Matrix4()
    this.viewMatrix.compose(this.position, this.quaternion, this.scale)
    this.viewMatrix.invert()
    return this.viewMatrix
  }
}
