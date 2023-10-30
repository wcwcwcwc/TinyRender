import { BufferAttribute } from '../data/BufferAttribute'
import Mesh from './Mesh'

export default class PlaneMesh extends Mesh {
  constructor(width: number, height: number) {
    super('cube', {
      width,
      height
    })
    this.setUp()
  }

  setUp() {
    const { height, width } = this.options
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
