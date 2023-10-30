import Material from './Material'
import { clamp } from '../math/Common'
interface PhongMaterialOptions {
  specularStrength: number
  shininess: number
  color: string
  opacity: number
}
export default class PhongMaterial extends Material {
  specularStrength: number
  shininess: number
  color: string
  opacity: number
  constructor(options: PhongMaterialOptions) {
    super({
      color: options.color,
      opacity: options.opacity
    })
    this.type = 'PhongMaterial'
    this.specularStrength = options.specularStrength || 0.5
    this.shininess = options.shininess || 32
  }
  setSpecularStrength(strength: number) {
    this.specularStrength = clamp(strength, 0, 1)
  }
  setShininess(shininess: number) {
    this.shininess = shininess
  }
  initProgram(gl: any, engine: any) {
    this.defines = ['#define PHONG_MATERIAL']
    super.initProgram(gl, engine)
  }
  bindUniform(engine: any, mesh: any) {
    super.bindUniform(engine, mesh)
    let gl = engine._gl
    const { ambientLight, light, camera } = engine
    let uniformLocations = this.program.uniformLocations
    for (let key in uniformLocations) {
      let uniformLocation = uniformLocations[key]

      if (key === 'u_ambientLightStrength' && ambientLight) {
        gl.uniform1f(uniformLocation, ambientLight.intensity)
      } else if (key === 'u_lightColor' && light) {
        let color = light.colorArray
        let r = color[0]
        let g = color[1]
        let b = color[2]
        gl.uniform3f(uniformLocation, r, g, b)
      } else if (key === 'u_lightPosition' && light) {
        let lightPosition = light.position
        gl.uniform3f(
          uniformLocation,
          lightPosition[0],
          lightPosition[1],
          lightPosition[2]
        )
      } else if (key === 'u_cameraPosition' && light) {
        let cameraPosition = camera.position
        gl.uniform3f(
          uniformLocation,
          cameraPosition.x,
          cameraPosition.y,
          cameraPosition.z
        )
      } else if (key === 'u_specularStrength' && light) {
        gl.uniform1f(uniformLocation, mesh.material.specularStrength)
      } else if (key === 'u_shininess' && light) {
        gl.uniform1f(uniformLocation, mesh.material.shininess)
      }
    }
  }
}
