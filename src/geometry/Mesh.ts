import Material from './Material'
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

interface Attributes {
  [key: string]: BufferAttribute
}

export default class Mesh {
  public type: string
  public options: any
  public position: Vector3
  public material: Material
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
    this.setUp()
  }

  setUp() {
    const { depth, height, width } = this.options
    switch (this.type) {
      case 'cube':
        this.buildPlane('z', 'y', 'x', -1, -1, depth, height, width, 1, 1, 0) // px
        this.buildPlane('z', 'y', 'x', 1, -1, depth, height, -width, 1, 1, 1) // nx
        this.buildPlane('x', 'z', 'y', 1, 1, width, depth, height, 1, 1, 2) // py
        this.buildPlane('x', 'z', 'y', 1, -1, width, depth, -height, 1, 1, 3) // ny
        this.buildPlane('x', 'y', 'z', 1, -1, width, height, depth, 1, 1, 4) // pz
        this.buildPlane('x', 'y', 'z', -1, -1, width, height, -depth, 1, 1, 5) // nz
        break

      case 'plane':
        const width_half = width / 2
        const height_half = height / 2

        const gridX = 1
        const gridY = 1

        const gridX1 = gridX + 1
        const gridY1 = gridY + 1

        const segment_width = width / gridX
        const segment_height = height / gridY

        for (let iy = 0; iy < gridY1; iy++) {
          const y = iy * segment_height - height_half

          for (let ix = 0; ix < gridX1; ix++) {
            const x = ix * segment_width - width_half

            this.vertices.push(x, -y, 0)

            this.normals.push(0, 0, 1)

            this.uvs.push(ix / gridX)
            this.uvs.push(1 - iy / gridY)
          }
        }

        for (let iy = 0; iy < gridY; iy++) {
          for (let ix = 0; ix < gridX; ix++) {
            const a = ix + gridX1 * iy
            const b = ix + gridX1 * (iy + 1)
            const c = ix + 1 + gridX1 * (iy + 1)
            const d = ix + 1 + gridX1 * iy

            this.indices.push(a, b, d)
            this.indices.push(b, c, d)
          }
        }
        break

      default:
        break
    }
    this.attributes['a_position'] = new BufferAttribute(
      new Float32Array(this.vertices),
      3,
      false
    )
    this.attributes['a_normal'] = new BufferAttribute(
      new Float32Array(this.normals),
      3,
      false
    )
    this.attributes['a_uv'] = new BufferAttribute(
      new Float32Array(this.uvs),
      2,
      false
    )
    this.index = new BufferAttribute(new Uint16Array(this.indices), 1, false)
  }
  buildPlane(
    u: string,
    v: string,
    w: string,
    udir: number,
    vdir: number,
    width: number,
    height: number,
    depth: number,
    gridX: number,
    gridY: number,
    materialIndex: number
  ) {
    const segmentWidth = width / gridX
    const segmentHeight = height / gridY

    const widthHalf = width / 2
    const heightHalf = height / 2
    const depthHalf = depth / 2

    const gridX1 = gridX + 1
    const gridY1 = gridY + 1

    let vertexCounter = 0
    let groupCount = 0

    let vector = new Vector3()

    // generate vertices, normals and uvs

    for (let iy = 0; iy < gridY1; iy++) {
      const y = iy * segmentHeight - heightHalf

      for (let ix = 0; ix < gridX1; ix++) {
        const x = ix * segmentWidth - widthHalf
        if (u === 'z' && v === 'y' && w === 'x') {
          vector.z = x * udir
          vector.y = y * vdir
          vector.x = depthHalf

          this.vertices.push(vector.x, vector.y, vector.z)
          vector.z = 0
          vector.y = 0
          vector.x = depth > 0 ? 1 : -1

          this.normals.push(vector.x, vector.y, vector.z)
        }
        if (u === 'x' && v === 'z' && w === 'y') {
          vector.x = x * udir
          vector.z = y * vdir
          vector.y = depthHalf

          this.vertices.push(vector.x, vector.y, vector.z)
          vector.x = 0
          vector.z = 0
          vector.y = depth > 0 ? 1 : -1

          this.normals.push(vector.x, vector.y, vector.z)
        }
        if (u === 'x' && v === 'y' && w === 'z') {
          vector.x = x * udir
          vector.y = y * vdir
          vector.z = depthHalf

          this.vertices.push(vector.x, vector.y, vector.z)
          vector.x = 0
          vector.y = 0
          vector.z = depth > 0 ? 1 : -1

          this.normals.push(vector.x, vector.y, vector.z)
        }
        // uvs

        this.uvs.push(ix / gridX)
        this.uvs.push(1 - iy / gridY)

        // counters

        vertexCounter += 1
      }
    }

    // indices

    // 1. you need three indices to draw a single face
    // 2. a single segment consists of two faces
    // 3. so we need to generate six (2*3) indices per segment

    for (let iy = 0; iy < gridY; iy++) {
      for (let ix = 0; ix < gridX; ix++) {
        const a = this.numberOfVertices + ix + gridX1 * iy
        const b = this.numberOfVertices + ix + gridX1 * (iy + 1)
        const c = this.numberOfVertices + (ix + 1) + gridX1 * (iy + 1)
        const d = this.numberOfVertices + (ix + 1) + gridX1 * iy

        // faces

        this.indices.push(a, b, d)
        this.indices.push(b, c, d)

        // increase counter

        groupCount += 6
      }
    }

    this.numberOfVertices += vertexCounter
  }

  setPosition(position: number[]) {
    this.position.set(position[0], position[1], position[2])
  }
  updateWorldMatrix() {
    this.worldMatrix.compose(this.position, this.quaternion, this.scale)
  }
}
