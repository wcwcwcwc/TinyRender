import Material from './Material'
import Mesh from './Mesh'

export default class Geometry {
  public mesh: Mesh
  public material: Material
  constructor(mesh: Mesh, material: Material) {
    this.mesh = mesh
    this.material = material
  }
}
