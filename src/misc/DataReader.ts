export interface IDataBuffer {
  readAsync(byteOffset: number, byteLength: number): Promise<ArrayBufferView>
  readonly byteLength: number
}

export function readAsync(
  arrayBuffer: ArrayBuffer,
  byteOffset: number,
  byteLength: number
): Promise<Uint8Array> {
  try {
    return Promise.resolve(new Uint8Array(arrayBuffer, byteOffset, byteLength))
  } catch (e) {
    return Promise.reject(e)
  }
}

/**
 * 从dataBuffer中获取数据
 */
export class DataReader {
  public readonly buffer: IDataBuffer

  public byteOffset = 0

  private _dataView: DataView
  private _dataByteOffset: number
  constructor(buffer: IDataBuffer) {
    this.buffer = buffer
  }

  /**
   *
   * @param byteLength 读取多长的数据
   * @returns
   */
  public loadAsync(byteLength: number): Promise<void> {
    return this.buffer.readAsync(this.byteOffset, byteLength).then(data => {
      this._dataView = new DataView(
        data.buffer,
        data.byteOffset,
        data.byteLength
      )
      this._dataByteOffset = 0
    })
  }

  /**
   * 向后读取4个字节的数据
   * @returns
   */
  public readUint32(): number {
    const value = this._dataView.getUint32(this._dataByteOffset, true)
    this._dataByteOffset += 4
    this.byteOffset += 4
    return value
  }

  public readUint8Array(byteLength: number): Uint8Array {
    const value = new Uint8Array(
      this._dataView.buffer,
      this._dataView.byteOffset + this._dataByteOffset,
      byteLength
    )
    this._dataByteOffset += byteLength
    this.byteOffset += byteLength
    return value
  }

  /**
   * 字节转字符串
   * @param byteLength
   * @returns
   */
  public readString(byteLength: number): string {
    let buffer = this.readUint8Array(byteLength)
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder().decode(buffer)
    }

    let result = ''
    for (let i = 0; i < buffer.byteLength; i++) {
      result += String.fromCharCode(buffer[i])
    }

    return result
  }

  /**
   * 跳过多少长度数据
   * @param byteLength
   */
  public skipBytes(byteLength: number): void {
    this._dataByteOffset += byteLength
    this.byteOffset += byteLength
  }
}
