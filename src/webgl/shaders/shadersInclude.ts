//@ts-nocheck
import shadowMapVertexDeclaration from './shadersInclude/shadowMapVertexDeclaration.glsl'
import shadowMapVertex from './shadersInclude/shadowMapVertex.glsl'
import shadowMapFragmentDeclaration from './shadersInclude/shadowMapFragmentDeclaration.glsl'
import shadowMapFragment from './shadersInclude/shadowMapFragment.glsl'
import commonFragmentDeclaration from './shadersInclude/commonFragmentDeclaration..glsl'

export const ShaderInclude: any = {
  shadowMapVertexDeclaration,
  shadowMapVertex,
  shadowMapFragmentDeclaration,
  shadowMapFragment,
  commonFragmentDeclaration
}
