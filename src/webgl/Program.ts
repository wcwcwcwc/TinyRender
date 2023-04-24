interface Location {
  [key: string]: any
}

export default class Program {
  public program: any
  public failedToCreate: boolean
  public vs: string
  public fs: string
  public gl: any
  public attributesLocations: Location
  public uniformLocations: Location
  constructor(options: any) {
    const { gl, vs, fs } = options
    this.program = gl.createProgram()
    this.gl = gl
    this.vs = vs
    this.fs = fs
    this.attributesLocations = {} // 记录attributes对应的location
    this.uniformLocations = {} // 记录uniform对应的location

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)
    if (gl.isContextLost()) {
      this.failedToCreate = true
      return
    }
    gl.shaderSource(fragmentShader, fs)
    gl.compileShader(fragmentShader)
    gl.attachShader(this.program, fragmentShader)

    const vertexShader = gl.createShader(gl.VERTEX_SHADER)
    if (gl.isContextLost()) {
      this.failedToCreate = true
      return
    }
    gl.shaderSource(vertexShader, vs)
    gl.compileShader(vertexShader)
    gl.attachShader(this.program, vertexShader)

    gl.linkProgram(this.program)

    // add this for extra debugging
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      var info = gl.getProgramInfoLog(this.program)
      throw new Error('Could not compile WebGL program. \n\n' + info)
    }

    // 绑定attributes
    this.bindAttributeLocations()
    // 绑定uniform
    this.bindUniformLocations()
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)
  }

  bindAttributeLocations() {
    const { gl, vs, fs, program } = this
    const n = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES)

    for (let i = 0; i < n; i++) {
      const info = gl.getActiveAttrib(program, i)
      const name: any = info.name

      let location = gl.getAttribLocation(program, name)

      gl.bindAttribLocation(this.program, i, name)

      this.attributesLocations[name] = location
    }
  }
  bindUniformLocations() {
    const { gl, vs, fs, program } = this
    const n = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)

    for (let i = 0; i < n; ++i) {
      const info = gl.getActiveUniform(program, i)
      const name: any = info.name
      let location = gl.getUniformLocation(program, name)
      this.uniformLocations[name] = location
    }
  }
}
