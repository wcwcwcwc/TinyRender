import Engine from '../engine/Engine'
import Mesh from '../mesh/Mesh'
import SkyBoxMaterial from '../material/SkyBoxMaterial'
import HDRCubeTexture from '../texture/HDRCubeTexture'
import {
  IndexBuffer,
  VertexArrayObject,
  VertexBuffer
} from '../webgl/VertexArrayObject'
import CubeMesh from '../mesh/CubeMesh'

export default class SkyBox {
  environmentTexture: HDRCubeTexture
  skyBoxMesh: Mesh
  skyBoxMaterial: SkyBoxMaterial
  engine: Engine
  gl: any
  constructor(engine: Engine, environmentTexture: HDRCubeTexture) {
    this.engine = engine
    this.gl = engine._gl
    this.environmentTexture = environmentTexture
    this.setUp()
  }
  setUp() {
    this.skyBoxMesh = new CubeMesh(1000, 1000, 1000)
    this.skyBoxMaterial = new SkyBoxMaterial({
      environmentTexture: this.environmentTexture
    })
    this.skyBoxMesh.material = this.skyBoxMaterial
  }
  draw() {
    this.skyBoxMaterial.initProgram(this.gl, this.engine)
    let program = this.skyBoxMaterial.program
    if (!program) return

    let { attributesLocations, uniformLocations } = program
    this.skyBoxMesh.updateWorldMatrix()
    let attributes = this.skyBoxMesh.attributes
    for (let key in attributesLocations) {
      let bufferAttribute = attributes[key]
      let attributeLocation = attributesLocations[key]
      if (attributes[key]) {
        let vertexBuffer = new VertexBuffer(
          this.gl,
          bufferAttribute,
          attributeLocation,
          false
        )
        bufferAttribute.vertexBuffer = vertexBuffer
        this.skyBoxMesh.vertexBufferArray.push(vertexBuffer)
      }
    }
    this.skyBoxMesh.indexBuffer = new IndexBuffer(
      this.gl,
      this.skyBoxMesh.index,
      false
    )
    this.gl.useProgram(program.program)
    this.skyBoxMesh.vao = new VertexArrayObject(this.gl)
    this.skyBoxMesh.vao.packUp(
      this.skyBoxMesh.vertexBufferArray,
      this.skyBoxMesh.indexBuffer
    )
    this.skyBoxMaterial.bindUniform(this.engine, this.skyBoxMesh)
    this.skyBoxMaterial.bindSkyBoxUniform(this.engine, uniformLocations)
    // draw
    this.skyBoxMesh.vao.bind()
    this.gl.enable(this.gl.DEPTH_TEST)
    this.gl.depthFunc(this.gl.LEQUAL)
    this.gl.depthMask(true)
    this.gl.disable(this.gl.CULL_FACE)
    this.gl.disable(this.gl.BLEND)

    this.gl.drawElements(
      this.gl.TRIANGLES,
      this.skyBoxMesh.indexBuffer.count,
      this.gl.UNSIGNED_SHORT,
      0
    )
    this.skyBoxMesh.vao.unbind()
  }
}
