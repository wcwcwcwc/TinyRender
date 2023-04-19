import { StaticDrawUsage } from '../constants.js'
import {
  VertexBuffer,
  IndexBuffer,
  VertexArrayObject
} from '../webgl/VertexArrayObject'
export class BufferAttribute {
  public name: string
  public array: any
  public itemSize: number
  public count: number
  public normalized: boolean
  public usage: number
  public updateRange: any
  public type: number
  public stride: number
  public offset: number
  public vertexBuffer: VertexBuffer | null
  public IndexBuffer: IndexBuffer | null
  constructor(array: any, itemSize: number, normalized: boolean) {
    this.name = ''

    this.array = array
    this.itemSize = itemSize
    this.count = array !== undefined ? array.length / itemSize : 0
    this.normalized = normalized === true

    this.usage = StaticDrawUsage
    this.updateRange = { offset: 0, count: -1 }
    this.stride = 0
    this.offset = 0
    this.vertexBuffer = null
    this.IndexBuffer = null
  }
}
