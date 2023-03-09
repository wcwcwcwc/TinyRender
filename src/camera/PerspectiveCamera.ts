import * as THREE from 'three'
import { OrbitControls } from 'three-orbitcontrols-ts'

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
  constructor(options: IPerspectiveCamera, canvas: any) {
    this.canvas = canvas
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
    this.cameraControls = new OrbitControls(this.camera, this.canvas)
    this.cameraControls.enableZoom = true
    this.cameraControls.enableRotate = true
    this.cameraControls.enablePan = true
    this.cameraControls.rotateSpeed = 0.3
    this.cameraControls.zoomSpeed = 1.0
    this.cameraControls.panSpeed = 2.0
    this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight
    this.camera.updateProjectionMatrix()
    this.cameraControls.target.set(0, 1, 0)
  }
  // 设置相机位置
  setPosition(cameraPosition: Array<number>) {
    this.camera.position.set(
      cameraPosition[0],
      cameraPosition[1],
      cameraPosition[2]
    )
  }
}
