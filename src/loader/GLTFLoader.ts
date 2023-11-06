/**
 * GLTF 2.0模型加载
 * 1. 请求
 * 2. 解析
 * 3. 数据转换成本引擎支持的数据格式，如顶点属性、纹理、材质等
 */
export default class GLTFLoader {
  path: string
  fileName: string
  callback: Function
  constructor(path: string, fileName: string, callback: Function) {
    this.path = path
    this.fileName = fileName
    this.callback = callback
  }
}
