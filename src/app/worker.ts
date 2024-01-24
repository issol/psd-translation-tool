import Psd from '@webtoon/psd'
import { createMessage, validateMessage } from './messaging'

import {
  Psd as AgPsd,
  Layer as AgLayer,
  readPsd,
  byteArrayToBase64,
} from 'ag-psd'

import { initializeCanvas } from 'ag-psd/dist/helpers'

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

  console.log(
    `It took %d ms to send this message (main → worker, type: %o)`,
    Date.now() - timestamp,
    type,
  )

  if (type === 'ParseData') {
    console.time('Parse PSD file')
    const psd: any = Psd.parse(value)
    const agPsd = readPsd(value, {
      // skipLayerImageData: true,
      useImageData: true,
      skipThumbnail: true,
    })

    console.log(agPsd)
    const { canvas, children, ...agPsdWithoutCanvas } = agPsd

    // const bmp = (canvas as OffscreenCanvas)?.transferToImageBitmap()

    console.timeEnd('Parse PSD file')

    console.log(psd)

    const pixelData = await psd.composite()

    self.postMessage(
      createMessage('MainImageData', {
        pixelData,

        width: psd.width,
        height: psd.height,
        psd: agPsdWithoutCanvas,
        layerCount: psd.layers.length,
      }),
    )

    for (const [index, child] of children?.entries() ?? []) {
      self.postMessage(createMessage('Children', child))
    }

    // for (const [index, layer] of psd.layers.entries()) {
    //   // console.time(`Compositing layer ${index}`)
    //   const pixelData = await layer.composite(true, true)
    //   // console.timeEnd(`Compositing layer ${index}`)

    //   self.postMessage(
    //     createMessage('Layer', {
    //       pixelData,
    //       name: layer.name,
    //       left: layer.left,
    //       top: layer.top,
    //       width: layer.width,
    //       height: layer.height,
    //       type: layer.type,
    //     }),
    //     // [pixelData.buffer],
    //   )
    // }

    let originalGroup: AgLayer | undefined = children?.find(
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
        originalWidth: psd.width,
      }),
    )
  } else if (type === 'WriteFile') {
    const { originalFile, group, image } = value as {
      originalFile: {
        pixelData: Uint8ClampedArray
        width: number
        height: number
        layerCount: number
        psd: AgPsd
      } | null
      group: AgLayer[]
      image: ImageBitmap
    }

    // if (originalFile) {
    //   let copyOriginalFile = { ...originalFile.psd }
    //   let copyOriginalGroup = originalFile.psd.children?.find(
    //     value => value.name == '대사',
    //   )
    //   console.log(copyOriginalFile)

    //   console.log(copyOriginalGroup)
    //   let resultFile
    //   let resultGroup

    //   if (copyOriginalGroup) {
    //     let copyOriginalGroupChildren = copyOriginalFile.children ?? []

    //     resultGroup = {
    //       ...copyOriginalGroup,
    //       children: group,
    //       name: '대사 카피',
    //     }
    //     console.log(resultGroup)

    //     copyOriginalGroupChildren.push(resultGroup)
    //     resultFile = {
    //       ...copyOriginalFile,
    //       children: copyOriginalGroupChildren,
    //     }
    //   }

    //   console.log(resultFile)
    //   console.log(image)

    //   const canvas = new OffscreenCanvas(image.width, image.height)
    //   canvas.getContext('bitmaprenderer')?.transferFromImageBitmap(image)
    //   const canvas2 = new OffscreenCanvas(canvas.width, canvas.height)
    //   canvas2.getContext('2d')?.drawImage(canvas, 0, 0)

    //   const result: AgPsd = {
    //     ...resultFile,
    //     width: canvas2.width, // Assign a valid number value to the width property
    //     height: canvas2.height, // Assign a valid number value to the height property
    //     canvas: canvas2,
    //     // imageData: originalFile.psd.imageData,
    //     // canvas: canvas2,
    //   }

    //   // copyOriginalFile = {
    //   //   ...copyOriginalFile,
    //   //   canvas: canvas2,
    //   // }

    //   const arrayBuffer = writePsd(result)
    //   console.log(arrayBuffer)

    //   // need to draw onto new canvas because single canvas can't use both '2d' and 'bitmaprenderer' contexts

    //   // const arrayBuffer = writePsd(copyOriginalPsd)
    //   // console.log(arrayBuffer)

    //   // console.log(arrayBuffer)
    //   // const psd: any = Psd.parse(arrayBuffer)
    //   // console.log(psd)

    //   const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' })
    //   console.log(blob)

    //   self.postMessage(createMessage('DownloadFile', blob))
    // }
  } else {
    console.error(`Worker received a message that it cannot handle: %o`, data)
  }
})
