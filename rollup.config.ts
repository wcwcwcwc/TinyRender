import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import sourceMaps from 'rollup-plugin-sourcemaps'
import camelCase from 'lodash.camelcase'
import typescript from 'rollup-plugin-typescript2'
import json from 'rollup-plugin-json'
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload'
import glsl from 'rollup-plugin-glsl';

const pkg = require('./package.json')

const libraryName = 'TinyRender'

// function glsl(include) {
//   const filter = createFilter(include);
//   return {
//       name: 'glsl',
//       transform(code, id) {
//           if (!filter(id)) return;

//           // barebones GLSL minification
//           // if (minify) {
//               code = code.trim() // strip whitespace at the start/end
//                   .replace(/\s*\/\/[^\n]*\n/g, '\n') // strip double-slash comments
//                   .replace(/\n+/g, '\n') // collapse multi line breaks
//                   .replace(/\n\s+/g, '\n') // strip identation
//                   .replace(/\s?([+-\/*=,])\s?/g, '$1') // strip whitespace around operators
//                   .replace(/([;,\{\}])\n(?=[^#])/g, '$1'); // strip more line breaks
//           // }

//           return {
//               code: `export default ${JSON.stringify(code)};`,
//               map: {mappings: ''}
//           };
//       }
//   };
// }


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
    glsl({
			// By default, everything gets included
			include: ['src/webgl/shaders/*.glsl', 'src/webgl/shaders/shadersInclude/*.glsl'],

			// // Undefined by default
			// exclude: ['**/index.html'],

			// Source maps are on by default
			sourceMap: false
		}),
    // Resolve source maps to the original source
    sourceMaps(),
    serve({
      open: true, // 自动打开页面
      port: 8080,
      openPage: '/example/index.html', // 打开的页面
      contentBase: '',
      host:'192.168.76.22'
    }),
    // livereload({
    //   watch: 'example',
    //   port: 8080,
    // })
  ],
}
