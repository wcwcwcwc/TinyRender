function clamp(number: number, min: number, max: number) {
  if (number < min) {
    return min
  } else if (number > max) {
    return max
  } else {
    return number
  }
}

function rgbaToArray(color: string) {
  let colorArray = color
    .split('(')[1]
    .split(')')[0]
    .split(',')
    .map((item: any) => Number(item))
  return colorArray
}
export { clamp, rgbaToArray }
