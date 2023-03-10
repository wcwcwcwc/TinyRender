import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import sourceMaps from 'rollup-plugin-sourcemaps'
import camelCase from 'lodash.camelcase'
import typescript from 'rollup-plugin-typescript2'
import json from 'rollup-plugin-json'
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload'

const pkg = require('./package.json')

const libraryName = 'TinyRender'

export default {
  input: `src/${libraryName}.ts`,
  output: [
    { file: pkg.main, name: 'TinyRender', format: 'umd', sourcemap: true },
    { file: pkg.module, name: 'TinyRender', format: 'es', sourcemap: true },
  ],
  // Indicate here external modules you don't wanna include in your bundle (i.e.: 'lodash')
  external: [],
  watch: {
    include: 'src/**',
  },
  plugins: [
    // Allow json resolution
    json(),
    // Compile TypeScript files
    typescript({ useTsconfigDeclarationDir: true, clean: true }),
    // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
    commonjs(),
    // Allow node_modules resolution, so you can use 'external' to control
    // which external modules to include in the bundle
    // https://github.com/rollup/rollup-plugin-node-resolve#usage
    resolve(),

    // Resolve source maps to the original source
    sourceMaps(),
    serve({
      open: true, // 自动打开页面
      port: 8080,
      openPage: '/example/index.html', // 打开的页面
      contentBase: ''
    }),
    // livereload({
    //   watch: 'example',
    //   port: 8080,
    // })
  ],
}
