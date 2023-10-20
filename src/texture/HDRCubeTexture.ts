import Engine from '../engine/Engine'
import Texture from './Texture'
import { loadFile } from '../misc/Ajax'
import { HDRTools } from '../misc/Hdr'
import SphericalHarmonics from '../misc/SphericalHarmonics'

type Nullable<T> = T | null

export default class HDRCubeTexture extends Texture {
  public engine: Engine
  public url: string
  public size: number
  public gl: any
  public loaded: boolean
  public isCube: boolean
  public loadCallbackArray: Function[]
  public sphericalHarmonics: SphericalHarmonics
  private static _FacesMapping = [
    'right',
    'left',
    'up',
    'down',
    'front',
    'back'
  ]
  constructor(engine: Engine, url: string, size: number) {
    super(engine, url)
    this.isCube = true
    this.engine = engine
    this.url = url
    this.loaded = false
    this.gl = this.engine._gl
    this.size = size || 512
    this.width = size
    this.height = size
    this.noMipmap = false
    this.createCubeTexture()
    this.loadFile(
      this.url,
      data => {
        this.internalCallback(data)
      },
      undefined,
      undefined,
      true,
      () => {}
    )
    this.loadCallbackArray = []
  }

  loadFile(
    url: string,
    onSuccess: (data: string | ArrayBuffer, responseURL?: string) => void,
    onProgress?: (data: any) => void,
    offlineProvider?: any,
    useArrayBuffer?: boolean,
    onError?: (request?: any, exception?: any) => void
  ) {
    const request = loadFile(
      url,
      onSuccess,
      onProgress,
      offlineProvider,
      useArrayBuffer,
      onError
    )
    return request
  }

  internalCallback(data: any) {
    const faceDataArrays = this.processData(data)
    if (!faceDataArrays) {
      return
    }
    this.updateCubeTexture(faceDataArrays)
    this.loaded = true
    for (let index = 0; index < this.loadCallbackArray.length; index++) {
      const callback = this.loadCallbackArray[index]
      callback()
    }
    this.loadCallbackArray = []
  }
  processData(buffer: ArrayBuffer): Nullable<ArrayBufferView[]> {
    const data = HDRTools.GetCubeMapTextureData(buffer, this.size)

    //球谐参数计算
    this.sphericalHarmonics = new SphericalHarmonics()
    this.sphericalHarmonics.cubeMapToSphericalHarmonicsCoefficient(data)

    const results = []
    for (let j = 0; j < 6; j++) {
      const dataFace = <Float32Array>(
        (<any>data)[HDRCubeTexture._FacesMapping[j]]
      )
      results.push(dataFace)
    }
    return results
  }
  addLoadedCallback(callback: Function) {
    this.loadCallbackArray.push(callback)
  }
}
