/**
 * GLTF 2.0模型加载
 * 1. 请求
 * 2. 解析
 * 3. 数据转换成本引擎支持的数据格式，如顶点属性、纹理、材质等
 */

import Engine from '../engine/Engine'
import { loadFile } from '../misc/Ajax'
export default class GLTFLoader {
  engine: Engine
  path: string
  fileName: string
  callback: Function
  modelUrl: string
  json: any
  constructor(
    engine: Engine,
    path: string,
    fileName: string,
    callback: Function
  ) {
    this.engine = engine
    this.path = path
    this.fileName = fileName
    this.callback = callback
    this.modelUrl = path + fileName
    loadFile(
      this.modelUrl,
      data => {
        this.modelRequestCallback(data)
      },
      undefined,
      undefined,
      false,
      () => {}
    )
  }
  modelRequestCallback(data: any) {
    this.json = JSON.parse(data)
    this.addIndex()
    this.loadJson()
  }

  /**
   * 给gltf各个对象添加索引
   */
  addIndex() {
    this.assignIndex(this.json.accessors)
    this.assignIndex(this.json.animations)
    this.assignIndex(this.json.buffers)
    this.assignIndex(this.json.bufferViews)
    this.assignIndex(this.json.cameras)
    this.assignIndex(this.json.images)
    this.assignIndex(this.json.materials)
    this.assignIndex(this.json.meshes)
    this.assignIndex(this.json.nodes)
    this.assignIndex(this.json.samplers)
    this.assignIndex(this.json.scenes)
    this.assignIndex(this.json.skins)
    this.assignIndex(this.json.textures)
  }

  assignIndex(array: Array<any>): void {
    if (array) {
      for (let index = 0; index < array.length; index++) {
        array[index].index = index
      }
    }
  }

  loadJson(): Promise<void> {
    return Promise.resolve().then(() => {})
  }
}
