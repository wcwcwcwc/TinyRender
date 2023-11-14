/**
 * GLTF 2.0模型加载
 * 1. 请求
 * 2. 解析
 * 3. 数据转换成本引擎支持的数据格式，如顶点属性、纹理、材质等
 */

import { BufferAttribute } from '../data/BufferAttribute'
import Engine from '../engine/Engine'
import PBRMaterial from '../material/PBRMaterial'
import { Color3 } from '../math/Color'
import Mesh from '../mesh/Mesh'
import { loadFile } from '../misc/Ajax'

const enum ComponentType {
  BYTE = 5120,

  UNSIGNED_BYTE = 5121,

  SHORT = 5122,

  UNSIGNED_SHORT = 5123,

  UNSIGNED_INT = 5125,

  FLOAT = 5126
}
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
    this.loadJson().then(() => {
      console.log('loaded')
    })
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

  /**
   * 从整个gltf_json开始往下加载
   * @returns
   */
  loadJson(): Promise<void> {
    return Promise.resolve().then(() => {
      const promises = new Array<Promise<any>>()
      if (
        this.json.scene != undefined ||
        (this.json.scenes && this.json.scenes[0])
      ) {
        const scene = this.json.scenes[this.json.scene || 0]
        promises.push(this.loadScene(scene))
      }
    })
  }

  /**
   * 加载scene
   * @param scene
   * @returns
   */
  loadScene(scene: any): Promise<void> {
    const promises = new Array<Promise<any>>()
    if (scene.nodes) {
      for (const index of scene.nodes) {
        const node = this.json.nodes[index]
        promises.push(this.loadNode(node))
      }
    }
    return Promise.all(promises).then(() => {})
  }

  /**
   * 加载node
   * {
   *  mesh
   *  name
   *  rotation
   * }
   * @param node
   * @returns
   */
  loadNode(node: any): Promise<void> {
    const promises = new Array<Promise<any>>()
    const meshIndex = node.mesh
    if (meshIndex !== undefined) {
      const mesh = this.json.meshes[meshIndex]
      promises.push(this.loadMesh(mesh, node))
    }

    return Promise.all(promises).then(() => {})
  }

  /**
   * 加载mesh
   * {
   *  name
   *  primitives
   * }
   * @param mesh
   * @returns
   */
  loadMesh(mesh: any, node: any): Promise<Mesh> {
    const promises = new Array<Promise<any>>()
    const primitives = mesh.primitives
    if (primitives[0].index == undefined) {
      this.assignIndex(primitives)
    }
    if (primitives.length === 1) {
      const primitive = mesh.primitives[0]
      promises.push(
        this.loadMeshPrimitives(primitive, (tinyMesh: Mesh) => {
          if (node.rotation) {
            tinyMesh.quaternion.set(
              node.rotation[0],
              node.rotation[1],
              node.rotation[2],
              node.rotation[3]
            )
          }
          node.tinyMesh = tinyMesh
        })
      )
    }

    return Promise.all(promises).then(() => {
      return node.tinyMesh
    })
  }

  /**
   * 加载primitives
   * {
   *  attributes
   *    {
   *     NORMAL
   *     POSITION
   *     TEXCOORD_0
   *    }
   *  indices
   *  material
   * }
   * @param primitives
   */
  loadMeshPrimitives(primitives: any, callback: Function): Promise<Mesh> {
    const promises = new Array<Promise<any>>()
    let promise: Promise<any>

    let tinyMesh = new Mesh('', {})

    // attributes
    promises.push(this.loadVertexData(primitives, tinyMesh, () => {}))

    // material

    if (primitives.material == undefined) {
      // TODO:如果没有材质属性时,采用默认材质
    } else {
      const material = this.json.materials[primitives.material]
      promises.push(this.loadMaterial(material).then(() => {}))
    }

    callback(tinyMesh)
    promise = Promise.all(promises)
    return promise.then(() => {
      return tinyMesh
    })
  }

  /**
   * 加载纹理
   * {
   *  emissiveFactor:[]
   *  emissiveTexture:{index:3(对应textures)}
   *  normalTexture
   *  occlusionTexture
   *  pbrMetallicRoughness
   *
   * }
   * @param material
   */
  loadMaterial(material: any) {
    if (!material.data) {
      const tinyMaterial = this.createMaterial(material)
      material.data = {
        tinyMaterial,
        promise: this.loadMaterialProperties(material, tinyMaterial)
      }
    }

    return material.data.promise.then(() => {
      return material.data.tinyMaterial
    })
  }

  /**
   * 加载材质参数, gltf材质到tiny材质
   * 材质分为两大类:基础类材质和PBR材质
   * @param material
   * @param tinyMaterial
   */
  loadMaterialProperties(material: any, tinyMaterial: PBRMaterial) {
    const promises = new Array<Promise<any>>()

    // 基础类材质
    promises.push(this.loadMaterialBaseProperties(material, tinyMaterial))

    // PBR材质
    if (material.pbrMetallicRoughness) {
      promises.push(
        this.loadMaterialMetallicRoughnessProperties(
          material.pbrMetallicRoughness,
          tinyMaterial
        )
      )
    }

    return Promise.all(promises).then(() => {})
  }

  /**
   * 基础类材质:{
   *    normal
   *    emissiveFactor
   *    occlusionTexture
   *    ...
   * }
   * @param material
   * @param tinyMaterial
   */
  loadMaterialBaseProperties(material: any, tinyMaterial: PBRMaterial) {
    const promises = new Array<Promise<any>>()
    tinyMaterial.emissiveColor = material.emissiveFactor
      ? new Color3(
          material.emissiveFactor[0],
          material.emissiveFactor[1],
          material.emissiveFactor[2]
        )
      : new Color3(0, 0, 0)
    return Promise.all(promises).then(() => {})
  }

  /**
   * PBR材质:{
   *    baseColorTexture
   *    metallicRoughnessTexture
   * }
   * @param pbrMetallicRoughness
   * @param tinyMaterial
   */
  loadMaterialMetallicRoughnessProperties(
    pbrMetallicRoughness: any,
    tinyMaterial: PBRMaterial
  ) {
    const promises = new Array<Promise<any>>()
    return Promise.all(promises).then(() => {})
  }

  /**
   * 创建PBR材质
   * @param material
   * @returns
   */
  createMaterial(material: any) {
    const tinyMaterial = new PBRMaterial(this.engine, {
      metallic: 1,
      roughness: 1
    })
    return tinyMaterial
  }

  /**
   * 加载顶点索引和属性
   * 由于没有mesh的geometry对象,所以在这一步直接绑定索引和属性到mesh
   * {
   *  attributes
   *  indices
   * }
   * @param primitives
   * @param tinyMesh
   * @param callback
   * @returns
   */
  loadVertexData(primitives: any, tinyMesh: Mesh, callback: Function) {
    const promises = new Array<Promise<any>>()
    const attributes = primitives.attributes
    if (primitives.indices != undefined) {
      const accessor = this.json.accessors[primitives.indices]
      // indices部分
      promises.push(
        this.loadIndices(accessor).then((data: any) => {
          // console.log('index',data)
          // 添加indices给tinyMesh
          tinyMesh.index = new BufferAttribute(data, 1, false)
        })
      )
    }

    // attributes部分
    const loadAttribute = (
      attribute: string,
      attributeName: string,
      callback?: Function
    ) => {
      if (attributes[attribute] == undefined) {
        return
      }
      const accessor = this.json.accessors[attributes[attribute]]
      promises.push(
        this.loadVertex(accessor, attributeName).then(data => {
          const numComponents = this._getNumComponents(accessor.type)
          console.log(attributeName, data)
          tinyMesh.attributes[attributeName] = new BufferAttribute(
            data,
            numComponents,
            false
          )
        })
      )
    }
    loadAttribute('POSITION', 'a_position')
    loadAttribute('NORMAL', 'a_normal')
    loadAttribute('TEXCOORD_0', 'a_uv')
    loadAttribute('TANGENT', 'a_tangent')

    return Promise.all(promises).then(() => {})
  }

  /**
   * 加载顶点绘制索引
   * @param accessor
   * @param callback
   */
  loadIndices(accessor: any): Promise<Array<number>> {
    const bufferView = this.json.bufferViews[accessor.bufferView]
    accessor.data = this.loadBufferView(bufferView).then((data: any) => {
      const numComponents = this._getNumComponents(accessor.type)
      const length = numComponents * accessor.count
      // 数据转换到componentType对应的数据类型
      return this._getTypedArray(
        accessor.componentType,
        data,
        accessor.byteOffset,
        length
      )
    })
    return accessor.data as Promise<Array<number>>
  }

  /**
   * 加载顶点属性attribute
   * @param accessor
   * @param attributeName
   */
  loadVertex(accessor: any, attributeName: string) {
    const bufferView = this.json.bufferViews[accessor.bufferView]
    accessor.data = this.loadBufferView(bufferView).then((data: any) => {
      const numComponents = this._getNumComponents(accessor.type)
      const length = numComponents * accessor.count

      // 数据转换到componentType对应的数据类型
      return this._getTypedArray(
        accessor.componentType,
        data,
        accessor.byteOffset,
        length
      )
    })
    return accessor.data as Promise<Array<number>>
  }

  /**
   * 加载bufferView
   * {
   *  buffer
   *  byteLength
   *  byteOffset
   *  target
   * }
   * @param bufferView
   * @returns
   */
  loadBufferView(bufferView: any) {
    const buffer = this.json.buffers[bufferView.buffer]
    if (bufferView.data) {
      return bufferView.data
    }
    bufferView.data = this.loadBuffer(
      buffer,
      bufferView.byteOffset || 0,
      bufferView.byteLength
    )
    return bufferView.data
  }

  /**
   * 加载buffer
   * {
   *  byteLength
   *  uri
   * }
   * @param buffer
   * @param byteOffset
   * @param byteLength
   */
  loadBuffer(buffer: any, byteOffset: number, byteLength: number) {
    if (!buffer.data) {
      if (buffer.uri) {
        buffer.data = this.loadUri(buffer.uri)
      }
    }
    return buffer.data.then((data: any) => {
      try {
        // 根据byteOffset和byteLength对buffer做裁剪
        return new Uint8Array(
          data.buffer,
          data.byteOffset + byteOffset,
          byteLength
        )
        // console.log(data)
      } catch (error) {}
    })
  }

  /**
   * 加载uri,获取二进制buffer数据
   * @param uri
   */
  loadUri(uri: string) {
    return new Promise((resolve, reject) => {
      loadFile(
        this.path + uri,
        data => {
          resolve(new Uint8Array(data as ArrayBuffer))
        },
        undefined,
        undefined,
        true,
        () => {}
      )
    })
  }

  /**
   * 数据类型转换
   * @param componentType
   * @param bufferView
   * @param byteOffset
   * @param length
   * @returns
   */
  _getTypedArray(
    componentType: number,
    bufferView: ArrayBufferView,
    byteOffset: number | undefined,
    length: number
  ) {
    const buffer = bufferView.buffer
    byteOffset = bufferView.byteOffset + (byteOffset || 0)
    const componentTypeConstructor = this._getTypedArrayConstructor(
      componentType
    )
    return new componentTypeConstructor(buffer, byteOffset, length)
  }

  _getTypedArrayConstructor(componentType: number) {
    switch (componentType) {
      case ComponentType.BYTE:
        return Int8Array
      case ComponentType.UNSIGNED_BYTE:
        return Uint8Array
      case ComponentType.SHORT:
        return Int16Array
      case ComponentType.UNSIGNED_SHORT:
        return Uint16Array
      case ComponentType.UNSIGNED_INT:
        return Uint32Array
      case ComponentType.FLOAT:
        return Float32Array
      default:
        throw new Error(`Invalid component type ${componentType}`)
    }
  }

  _getNumComponents(type: string) {
    switch (type) {
      case 'SCALAR':
        return 1
      case 'VEC2':
        return 2
      case 'VEC3':
        return 3
      case 'VEC4':
        return 4
      case 'MAT2':
        return 4
      case 'MAT3':
        return 9
      case 'MAT4':
        return 16
    }

    throw new Error(` Invalid type (${type})`)
  }
}
