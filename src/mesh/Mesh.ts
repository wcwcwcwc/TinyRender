import Material from '../material/Material'
import PhongMaterial from '../material/PhongMaterial'
import { Vector3 } from '../math/Vector3'
import { Matrix4 } from '../math/Matrix4'
import { Euler } from '../math/Euler'
import { Quaternion } from '../math/Quaternion'
import { BufferAttribute } from '../data/BufferAttribute'
import {
  VertexBuffer,
  IndexBuffer,
  VertexArrayObject
} from '../webgl/VertexArrayObject'
import Program from '../webgl/Program'

export interface Attributes {
  [key: string]: BufferAttribute
}

/**
 * Mesh类，可自定义顶点数据
 */
export default class Mesh {
  public type: string
  public options: any
  public position: Vector3
  public material: any
  public indices: Array<number> = []
  public vertices: Array<number> = []
  public normals: Array<number> = []
  public uvs: Array<number> = []
  public numberOfVertices: number
  public worldMatrix: Matrix4
  public attributes: Attributes
  public index: BufferAttribute
  public vertexBufferArray: VertexBuffer[]
  public vao: VertexArrayObject | null
  public program: Program
  public indexBuffer: IndexBuffer
  public quaternion: Quaternion
  public rotation: Euler
  public scale: Vector3
  public userData: any
  constructor(type: string, options: any) {
    this.type = type
    this.options = options
    this.position = new Vector3()
    this.numberOfVertices = 0
    this.worldMatrix = new Matrix4()
    this.attributes = {}
    this.vertexBufferArray = []
    this.vao = null
    this.rotation = new Euler()
    this.quaternion = new Quaternion()
    this.scale = new Vector3(1, 1, 1)
    this.userData = {}
  }

  setPosition(position: number[]) {
    this.position.set(position[0], position[1], position[2])
  }
  updateWorldMatrix() {
    this.worldMatrix.compose(this.position, this.quaternion, this.scale)
  }
}
