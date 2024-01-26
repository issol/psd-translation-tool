import { createMessage, validateMessage } from './messaging'

import {
  Psd as AgPsd,
  Layer as AgLayer,
  readPsd,
  byteArrayToBase64,
  writePsd,
  initializeCanvas,
} from 'ag-psd'

declare const self: DedicatedWorkerGlobalScope

const createCanvas = (width: number, height: number) => {
  const canvas = new OffscreenCanvas(width, height)
  canvas.width = width
  canvas.height = height
  return canvas
}

const createCanvasFromData = (data: Uint8Array) => {
  const image = new Image()
  image.src = 'data:image/jpeg;base64,' + byteArrayToBase64(data)
  const canvas = new OffscreenCanvas(image.width, image.height)
  canvas.width = image.width
  canvas.height = image.height
  canvas.getContext('2d')?.drawImage(image, 0, 0)
  return canvas
}

initializeCanvas(createCanvas, createCanvasFromData)

self.addEventListener('message', async ({ data }) => {
  const { type, timestamp, value } = data

  validateMessage(data)
  console.log(value)

  if (type === 'ParseLayer') {
    const imageAgPsd = readPsd(value, {
      useImageData: true,
      skipThumbnail: true,
    })
    let originalGroup: AgLayer | undefined = imageAgPsd.children?.find(
      value => value.name == '대사',
    )

    let box =
      originalGroup?.children?.map(value => ({
        top: value.top!,
        left: value.left!,
        name: value.name ?? '',
      })) ?? []

    self.postMessage(
      createMessage('Group', {
        box: box,
        group: originalGroup,
        originalWidth: imageAgPsd.width,
      }),
    )
  }
})
