/**
 * SH用以系数替代传统的漫反射贴图，减少存储量
 * 加载cubeMap时，用以从此环境贴图中计算球谐系数：L与A
 * 默认计算三阶的球谐，共9项
 * pbr着色器中，计算漫反射时，传入此9项系数。
 */

export default class SphericalHarmonics {
  constructor() {}
}
