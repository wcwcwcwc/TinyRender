/**
 * GLTF 2.0模型加载
 * 1. 请求
 * 2. 解析
 * 3. 数据转换成本引擎支持的数据格式，如顶点属性、纹理、材质等
 */

import { BufferAttribute } from '../data/BufferAttribute'
import Engine from '../engine/Engine'
import Material from '../material/Material'
import PBRMaterial from '../material/PBRMaterial'
import { Color3 } from '../math/Color'
import Mesh from '../mesh/Mesh'
import { loadFile } from '../misc/Ajax'
import CONSTANTS from '../texture/Constants'
import Texture from '../texture/Texture'
import Texture2D from '../texture/Texture2D'
import { DataReader, readAsync, IDataBuffer } from '../misc/DataReader'
import { Matrix4 } from '../math/Matrix4'

type Nullable<T> = T | null

const enum ComponentType {
  BYTE = 5120,

  UNSIGNED_BYTE = 5121,

  SHORT = 5122,

  UNSIGNED_SHORT = 5123,

  UNSIGNED_INT = 5125,

  FLOAT = 5126
}

export interface IGLTFLoaderData {
  json: Object

  bin: Nullable<IDataBuffer>
}
export default class GLTFLoader {
  engine: Engine
  path: string
  fileName: string
  callback: Function
  modelUrl: string
  json: any
  bin: any
  modelSuffix: string
  useArrayBuffer: boolean
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
    this.modelSuffix = this.fileName
      .substring(this.fileName.lastIndexOf('.'), this.fileName.length)
      .toLowerCase()
    this.useArrayBuffer = this.modelSuffix === '.glb'
    this.load()
  }

  load() {
    // GLB
    if (this.useArrayBuffer) {
      loadFile(
        this.modelUrl,
        data => {
          this.unpackBinary(
            new DataReader({
              readAsync: (byteOffset, byteLength) =>
                readAsync(data as ArrayBuffer, byteOffset, byteLength),
              byteLength: (data as ArrayBuffer).byteLength
            })
          ).then(loaderData => {
            this.json = loaderData.json
            this.bin = loaderData.bin
            this.addIndex()
            this.loadJson().then(() => {
              console.log('loaded')
            })
          })
        },
        undefined,
        undefined,
        true,
        () => {}
      )
    } else {
      // GLTF
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
  }

  /**
   * 解析GLB文件
   * @param dataReader
   */
  unpackBinary(dataReader: DataReader) {
    // 首先解码GLB文件头，magic + version + length 表示整个GLB的长度，共12字节，
    // 再然后是glb json的长度和规范（是否是二进制或json），共8字节，一共20字节
    //magic + version + length + json length + json format
    return dataReader.loadAsync(20).then(() => {
      const Binary = {
        Magic: 0x46546c67
      }

      const magic = dataReader.readUint32()
      if (magic !== Binary.Magic) {
        throw new Error('当前GLB文件头不符合规范')
      }

      const version = dataReader.readUint32()

      const length = dataReader.readUint32()
      if (
        dataReader.buffer.byteLength !== 0 &&
        length !== dataReader.buffer.byteLength
      ) {
        throw new Error('当前GLB文件头的长度与真实GLB长度不符')
      }

      let unpacked: Promise<IGLTFLoaderData>
      switch (version) {
        // case 1: {
        //   console.error('抱歉，暂未支持gltf1.0')
        //   break
        // }
        case 2: {
          unpacked = this.unpackBinaryV2(dataReader, length)
          break
        }
        default: {
          throw new Error('Unsupported version: ' + version)
        }
      }
      return unpacked
    })
  }

  /**
   * 解码gltf2.0版本的json体和chunk
   * @param dataReader
   * @param length
   */
  unpackBinaryV2(
    dataReader: DataReader,
    length: number
  ): Promise<IGLTFLoaderData> {
    const ChunkFormat = {
      JSON: 0x4e4f534a,
      BIN: 0x004e4942
    }

    // json体
    const chunkLength = dataReader.readUint32()
    const chunkFormat = dataReader.readUint32()
    if (chunkFormat !== ChunkFormat.JSON) {
      throw new Error('第一个chunk不是json格式')
    }

    // 不存在chunk
    if (dataReader.byteOffset + chunkLength === length) {
      return dataReader.loadAsync(chunkLength).then(() => {
        return {
          json: JSON.parse(dataReader.readString(chunkLength)),
          bin: null
        }
      })
    }

    // 解析chunk
    return dataReader.loadAsync(chunkLength + 8).then(() => {
      const data: IGLTFLoaderData = {
        json: JSON.parse(dataReader.readString(chunkLength)),
        bin: null
      }

      const readAsync = (): Promise<IGLTFLoaderData> => {
        const chunkLength = dataReader.readUint32()
        const chunkFormat = dataReader.readUint32()

        switch (chunkFormat) {
          case ChunkFormat.JSON: {
            throw new Error('Unexpected JSON chunk')
          }
          case ChunkFormat.BIN: {
            const startByteOffset = dataReader.byteOffset
            data.bin = {
              readAsync: (byteOffset, byteLength) =>
                dataReader.buffer.readAsync(
                  startByteOffset + byteOffset,
                  byteLength
                ),
              byteLength: chunkLength
            }
            dataReader.skipBytes(chunkLength)
            break
          }
          default: {
            dataReader.skipBytes(chunkLength)
            break
          }
        }

        if (dataReader.byteOffset !== length) {
          return dataReader.loadAsync(8).then(readAsync)
        }

        return Promise.resolve(data)
      }

      return readAsync()
    })
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
  loadJson(): Promise<any> {
    return Promise.resolve().then(() => {
      const promises = new Array<Promise<any>>()
      if (
        this.json.scene != undefined ||
        (this.json.scenes && this.json.scenes[0])
      ) {
        const scene = this.json.scenes[this.json.scene || 0]
        promises.push(
          this.loadScene(scene).then((meshArray: Array<Mesh>) => {
            this.callback(meshArray)
          })
        )
      }
    })
  }

  /**
   * 加载scene
   * @param scene
   * @returns
   */
  loadScene(scene: any): Promise<any> {
    const promises = new Array<Promise<any>>()
    let meshArray: Array<Mesh> = []
    if (scene.nodes) {
      for (const index of scene.nodes) {
        const node = this.json.nodes[index]
        promises.push(
          this.loadNode(node).then((tinyMesh: Mesh) => {
            meshArray.push(tinyMesh)
          })
        )
      }
    }
    return Promise.all(promises).then(() => {
      return meshArray
    })
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
  loadNode(node: any, parentNode?: any): any {
    const promises = new Array<Promise<any>>()
    const meshIndex = node.mesh
    let worldMatrix = new Matrix4()

    if (node.matrix) {
      worldMatrix.fromArray(node.matrix)
    }
    if (parentNode) {
      worldMatrix.multiplyMatrices(parentNode.worldMatrix, worldMatrix)
    }
    node.worldMatrix = worldMatrix

    if (meshIndex !== undefined) {
      const mesh = this.json.meshes[meshIndex]
      promises.push(
        this.loadMesh(mesh, node).then((meshes: Array<Mesh>) => {
          node.tinyMesh = meshes
        })
      )

      return Promise.all(promises).then(() => {
        return node.tinyMesh
      })
    } else {
      if (node.children) {
        for (let index = 0; index < node.children.length; index++) {
          const nodeChild = node.children[index]
          return this.loadNode(this.json.nodes[nodeChild], node)
        }
        // const node = this.json.nodes[index]
      }
    }
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
  loadMesh(mesh: any, node: any): Promise<Array<Mesh>> {
    const promises = new Array<Promise<any>>()
    const primitives = mesh.primitives
    if (primitives[0].index == undefined) {
      this.assignIndex(primitives)
    }

    let meshes: Array<Mesh> = []
    for (let index = 0; index < primitives.length; index++) {
      const primitive = primitives[index]
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
          if (node.translation) {
            tinyMesh.position.set(
              node.translation[0],
              node.translation[1],
              node.translation[2]
            )
          }
          // worldMatrix由node传入mesh，
          // node.worldMatrix....

          if (node.worldMatrix) {
            tinyMesh.worldMatrix = node.worldMatrix
            node.worldMatrix.decompose(
              tinyMesh.position,
              tinyMesh.quaternion,
              tinyMesh.scale
            )
          }

          meshes.push(tinyMesh)
          // node.tinyMesh = tinyMesh
        })
      )
    }

    // if (primitives.length === 1) {
    //   const primitive = mesh.primitives[0]
    //   promises.push(
    //     this.loadMeshPrimitives(primitive, (tinyMesh: Mesh) => {
    //       if (node.rotation) {
    //         tinyMesh.quaternion.set(
    //           node.rotation[0],
    //           node.rotation[1],
    //           node.rotation[2],
    //           node.rotation[3]
    //         )
    //       }
    //       node.tinyMesh = tinyMesh
    //     })
    //   )
    // }

    return Promise.all(promises).then(() => {
      console.log('tinyMesh', meshes)
      return meshes
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

    // 单个mesh
    let tinyMesh = new Mesh('', {})

    // attributes
    promises.push(this.loadVertexData(primitives, tinyMesh, () => {}))

    // material

    if (primitives.material == undefined) {
      // TODO:如果没有材质属性时,采用默认材质
    } else {
      const material = this.json.materials[primitives.material]
      promises.push(
        this.loadMaterial(material).then((tinyMaterial: Material) => {
          tinyMesh.material = tinyMaterial
        })
      )
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
    // TODO：材质是否透明,渲染队列判别

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
    if (material.normalTexture) {
      promises.push(
        this.loadTextureInfo(material.normalTexture, (tinyTexture: Texture) => {
          tinyMaterial.normalTexture = tinyTexture
          console.log('normalTexture', tinyTexture.loaded, tinyTexture)
        })
      )
    }
    if (material.occlusionTexture) {
      promises.push(
        this.loadTextureInfo(
          material.occlusionTexture,
          (tinyTexture: Texture) => {
            tinyMaterial.ambientOcclusionTexture = tinyTexture
            console.log('occlusionTexture', tinyTexture.loaded, tinyTexture)
          }
        )
      )
    }
    if (material.emissiveTexture) {
      promises.push(
        this.loadTextureInfo(
          material.emissiveTexture,
          (tinyTexture: Texture) => {
            tinyMaterial.emissiveTexture = tinyTexture
            console.log('emissiveTexture', tinyTexture.loaded, tinyTexture)
          }
        )
      )
    }
    return Promise.all(promises).then(() => {})
  }

  /**
   * textures
   * [
   *  {sampler: 0, source: 0, index: 0}
   *  {sampler: 0, source: 1, index: 1}
   *  {sampler: 0, source: 2, index: 2}
   *  {sampler: 0, source: 3, index: 3}
   *  {sampler: 0, source: 4, index: 4}
   * ]
   * @param textureInfo
   * @param callback
   * @returns
   */
  loadTextureInfo(textureInfo: any, callback: Function) {
    const texture = this.json.textures[textureInfo.index]
    const promise = this.loadTexture(texture, (tinyTexture: Texture) => {
      callback(tinyTexture)
    })

    return promise
  }

  /**
   * sampler:纹理采样方式
   * image：纹理数据
   * @param texture
   * @param callback
   * @returns
   */
  loadTexture(texture: any, callback: Function) {
    const sampler =
      texture.sampler == undefined
        ? { index: -1 }
        : this.json.samplers[texture.sampler]
    const image = this.json.images[texture.source]
    const promise = this.createTexture(sampler, image).then(
      (tinyTexture: Texture) => {
        callback(tinyTexture)
      }
    )
    return promise
  }

  /**
   * 创建texture2D
   * @param sampler
   * @param image
   * @param callback
   * @returns
   */
  createTexture(sampler: any, image: any) {
    const samplerData = this.loadSampler(sampler)
    const promises = new Array<Promise<any>>()

    // 如果是GLTF，图片资源从请求中获取
    const tinyTexture = new Texture2D(
      this.engine,
      this.bin ? '' : this.path + image.uri,
      {
        noMipmap: samplerData.noMipMaps,
        magFilter: samplerData.magFilter,
        minFilter: samplerData.minFilter,
        wrapS: samplerData.wrapS,
        wrapT: samplerData.wrapT
      }
    )

    // 如果是GLB，图片资源从bufferView中获取
    if (this.bin) {
      const bufferView = this.json.bufferViews[image.bufferView]
      image.data = this.loadBufferView(bufferView).then((data: any) => {
        const img = new Image()
        const type = image.mimeType
        const blob = new Blob([data], { type })
        const url = URL.createObjectURL(blob)
        img.src = url
        img.addEventListener('load', () => {
          tinyTexture.update(img)
        })
      })
    }
    promises.push(
      new Promise((resolve, reject) => {
        tinyTexture.addLoadedCallback(() => {
          resolve(tinyTexture)
        })
      })
    )

    return Promise.all(promises).then(() => {
      return tinyTexture
    })
  }

  /**
   * 设置采样方式
   * {
   *  minFilter
   *  magFilter
   *  wrapS
   *  wrapT
   * }
   * @param sampler
   * @returns
   */
  loadSampler(sampler: any) {
    if (!sampler.data) {
      sampler.data = {
        noMipMaps:
          sampler.minFilter === CONSTANTS.NEAREST ||
          sampler.minFilter === CONSTANTS.LINEAR,
        magFilter:
          sampler.magFilter == undefined ? CONSTANTS.LINEAR : sampler.magFilter,
        minFilter:
          sampler.minFilter == undefined
            ? CONSTANTS.LINEAR_MIPMAP_LINEAR
            : sampler.minFilter,
        wrapS: sampler.wrapS == undefined ? CONSTANTS.REPEAT : sampler.wrapS,
        wrapT: sampler.wrapT == undefined ? CONSTANTS.REPEAT : sampler.wrapT
      }
    }
    return sampler.data
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
    if (pbrMetallicRoughness) {
      if (pbrMetallicRoughness.baseColorFactor) {
        tinyMaterial.baseColor = `rgb(${pbrMetallicRoughness.baseColorFactor[0]},${pbrMetallicRoughness.baseColorFactor[1]},${pbrMetallicRoughness.baseColorFactor[2]},${pbrMetallicRoughness.baseColorFactor[3]})`
      } else {
        tinyMaterial.baseColor = 'rgba(1,1,1,1)'
      }

      tinyMaterial.metallic =
        pbrMetallicRoughness.metallicFactor == undefined
          ? 1
          : pbrMetallicRoughness.metallicFactor
      tinyMaterial.roughness =
        pbrMetallicRoughness.roughnessFactor == undefined
          ? 1
          : pbrMetallicRoughness.roughnessFactor

      if (pbrMetallicRoughness.baseColorTexture) {
        promises.push(
          this.loadTextureInfo(
            pbrMetallicRoughness.baseColorTexture,
            (tinyTexture: Texture) => {
              tinyMaterial.baseColorTexture = tinyTexture
              console.log('baseColorTexture', tinyTexture.loaded, tinyTexture)
            }
          )
        )
      }
      if (pbrMetallicRoughness.metallicRoughnessTexture) {
        promises.push(
          this.loadTextureInfo(
            pbrMetallicRoughness.metallicRoughnessTexture,
            (tinyTexture: Texture) => {
              tinyMaterial.metallicRoughnessTexture = tinyTexture
              console.log(
                'metallicRoughnessTexture',
                tinyTexture.loaded,
                tinyTexture
              )
            }
          )
        )
      }
    }
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

    // AO从AO贴图的通道读取
    tinyMaterial.ambientOcclusionTextureReadOnly = true
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
          // console.log(attributeName, data)
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
      } else {
        buffer.data = this.bin.readAsync(0, buffer.byteLength)
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
