import { assetMarkup } from './assets.js'
import { FRAME_HEIGHT, FRAME_WIDTH } from './frame.js'
import type { FrameTransform } from './frame'
import type { Asset, Palette, PlacedObject } from '../types'

export function renderScene(scene: readonly PlacedObject[], assets: readonly Asset[], palette: Palette, frame: FrameTransform): string {
  const byId = new Map(assets.map(asset => [asset.id, asset]))
  const objects = [...scene].sort((a, b) => a.z - b.z).map(object => {
    const asset = byId.get(object.assetId)
    if (!asset) return ''
    const [, , width, height] = asset.viewBox.split(/[ ,]+/).map(Number)
    const scale = object.scale * FRAME_WIDTH / Math.max(width, height)
    const x = object.x * FRAME_WIDTH / 100
    const y = object.y * FRAME_HEIGHT / 100
    return `<g data-object-id="${object.id}" transform="translate(${x} ${y}) rotate(${object.rotation}) scale(${scale}) translate(${-width / 2} ${-height / 2})">${assetMarkup(asset, palette)}</g>`
  }).join('')
  const backdrop = scene.length
    ? `<svg data-figma-backdrop="${palette.id}" width="${FRAME_WIDTH}" height="${FRAME_HEIGHT}" viewBox="0 0 1000 1000" preserveAspectRatio="none" fill="none">${palette.backdrop}</svg>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FRAME_WIDTH} ${FRAME_HEIGHT}" width="${FRAME_WIDTH}" height="${FRAME_HEIGHT}"><defs><clipPath id="scene-frame"><rect width="${FRAME_WIDTH}" height="${FRAME_HEIGHT}" rx="24"/></clipPath></defs><g clip-path="url(#scene-frame)"><rect width="${FRAME_WIDTH}" height="${FRAME_HEIGHT}" fill="${palette.background}"/>${backdrop}<g transform="translate(${frame.x} ${frame.y}) scale(${frame.scale})">${objects}</g></g></svg>`
}
