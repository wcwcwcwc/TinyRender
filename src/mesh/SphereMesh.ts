import { BufferAttribute } from '../data/BufferAttribute'
import { Vector3 } from '../math/Vector3'
import Mesh from './Mesh'

export default class SphereMesh extends Mesh {
  constructor(radius: number) {
    super('cube', {
      radius
    })
    this.setUp()
  }

  setUp() {
    const { radius } = this.options
    let widthSegments = 64
    let heightSegments = 32
    let thetaStart = 0
    let thetaEnd = Math.PI
    let thetaLength = Math.PI
    let phiStart = 0
    let phiLength = Math.PI * 2

    let index = 0
    const grid = []

    const vertex = new Vector3()
    const normal = new Vector3()

    // generate vertices, normals and uvs

    for (let iy = 0; iy <= heightSegments; iy++) {
      const verticesRow = []

      const v = iy / heightSegments

      // special case for the poles

      let uOffset = 0

      if (iy == 0 && thetaStart == 0) {
        uOffset = 0.5 / widthSegments
      } else if (iy == heightSegments && thetaEnd == Math.PI) {
        uOffset = -0.5 / widthSegments
      }

      for (let ix = 0; ix <= widthSegments; ix++) {
        const u = ix / widthSegments

        // vertex

        vertex.x =
          -radius *
          Math.cos(phiStart + u * phiLength) *
          Math.sin(thetaStart + v * thetaLength)
        vertex.y = radius * Math.cos(thetaStart + v * thetaLength)
        vertex.z =
          radius *
          Math.sin(phiStart + u * phiLength) *
          Math.sin(thetaStart + v * thetaLength)

        this.vertices.push(vertex.x, vertex.y, vertex.z)

        // normal

        normal.copy(vertex).normalize()
        this.normals.push(normal.x, normal.y, normal.z)

        // uv

        this.uvs.push(u + uOffset, 1 - v)

        verticesRow.push(index++)
      }

      grid.push(verticesRow)
    }

    // indices

    for (let iy = 0; iy < heightSegments; iy++) {
      for (let ix = 0; ix < widthSegments; ix++) {
        const a = grid[iy][ix + 1]
        const b = grid[iy][ix]
        const c = grid[iy + 1][ix]
        const d = grid[iy + 1][ix + 1]

        if (iy !== 0 || thetaStart > 0) this.indices.push(a, b, d)
        if (iy !== heightSegments - 1 || thetaEnd < Math.PI)
          this.indices.push(b, c, d)
      }
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
}
