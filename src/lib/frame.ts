import type { Alignment, Asset, PlacedObject } from '../types'

export const FRAME_WIDTH = 1200
export const FRAME_HEIGHT = 630
export type FrameTransform = { x: number; y: number; scale: number }

export function frameTransform(scene: readonly PlacedObject[], assets: readonly Asset[], alignment: Alignment): FrameTransform {
  const byId = new Map(assets.map(asset => [asset.id, asset]))
  const boxes = scene.flatMap(object => {
    const asset = byId.get(object.assetId)
    if (!asset) return []
    const [, , width, height] = asset.viewBox.split(/[ ,]+/).map(Number)
    const scale = object.scale * FRAME_WIDTH / Math.max(width, height)
    if (!Number.isFinite(scale)) return []
    const angle = object.rotation * Math.PI / 180
    const halfWidth = scale * (Math.abs(width * Math.cos(angle)) + Math.abs(height * Math.sin(angle))) / 2
    const halfHeight = scale * (Math.abs(width * Math.sin(angle)) + Math.abs(height * Math.cos(angle))) / 2
    const x = object.x * FRAME_WIDTH / 100
    const y = object.y * FRAME_HEIGHT / 100
    return [{ left: x - halfWidth, right: x + halfWidth, top: y - halfHeight, bottom: y + halfHeight }]
  })
  if (!boxes.length) return { x: 0, y: 0, scale: 1 }
  const left = Math.min(...boxes.map(box => box.left))
  const right = Math.max(...boxes.map(box => box.right))
  const top = Math.min(...boxes.map(box => box.top))
  const bottom = Math.max(...boxes.map(box => box.bottom))
  const width = right - left
  const height = bottom - top
  const widthLimit = FRAME_WIDTH * (alignment === 'center' ? .92 : .60)
  const scale = Math.min(1, widthLimit / width, FRAME_HEIGHT * .88 / height)
  const margin = FRAME_WIDTH * .04
  const targetLeft = alignment === 'left' ? margin
    : alignment === 'right' ? FRAME_WIDTH - margin - width * scale
      : (FRAME_WIDTH - width * scale) / 2
  return { x: targetLeft - left * scale, y: (FRAME_HEIGHT - height * scale) / 2 - top * scale, scale }
}
