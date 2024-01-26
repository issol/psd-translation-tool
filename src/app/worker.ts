import Psd from '@webtoon/psd'
import { createMessage, validateMessage } from './messaging'

import {
  Psd as AgPsd,
  Layer as AgLayer,
  readPsd,
  byteArrayToBase64,
  writePsd,
} from 'ag-psd'

import { BalloonType } from './workspace/page'

declare const self: DedicatedWorkerGlobalScope
declare function initializeCanvas(
  createCanvasMethod: (
    width: number,
    height: number,
  ) => OffscreenCanvas | HTMLCanvasElement,
  createCanvasFromDataMethod?: (
    data: Uint8Array,
  ) => OffscreenCanvas | HTMLCanvasElement,
  createImageDataMethod?: (width: number, height: number) => ImageData,
): void

const DefaultGroup: AgLayer = {
  blendMode: 'normal',
  children: [],
  bottom: 0,
  left: 0,
  right: 0,
  top: 0,
  clipping: false,
  hidden: false,
  opacity: 1,
  opened: false,
  protected: {
    composite: false,
    position: false,
    transparency: false,
  },
  sectionDivider: {
    type: 2,
    key: 'norm',
  },
  transparencyProtected: false,
  transparencyShapesLayer: true,
}

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

async function addCanvasToChildren(node: AgLayer): Promise<AgLayer> {
  let newNode = { ...node }

  if (newNode.imageData) {
    const canvasEl = createCanvas(
      newNode.imageData.width,
      newNode.imageData.height,
    )
    const context = canvasEl.getContext(
      '2d',
    ) as OffscreenCanvasRenderingContext2D
    const imageData = new ImageData(
      new Uint8ClampedArray(newNode.imageData.data),
      newNode.imageData.width,
      newNode.imageData.height,
    )
    canvasEl.width = newNode.imageData.width
    canvasEl.height = newNode.imageData.height
    if (context) {
      context.putImageData(imageData, 0, 0)
      newNode.canvas = canvasEl
    }
  }

  if (newNode.children) {
    const childrenPromises = newNode.children.map(
      child =>
        new Promise<AgLayer>(resolve =>
          requestAnimationFrame(() => resolve(addCanvasToChildren(child))),
        ),
    )
    newNode.children = await Promise.all(childrenPromises)
  }

  return newNode
}

const createCanvasWithText = (item: BalloonType, scale: number) => {
  const canvas = createCanvas(item.width * scale + 15, item.height * scale)

  const ctx = canvas.getContext('2d')

  if (ctx) {
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.strokeStyle = 'black'
    ctx.lineWidth = 5
    ctx.strokeRect(0, 0, canvas.width, canvas.height)

    ctx.font = '30px Arial'
    ctx.fillStyle = 'black'
    const text = item.text
    const words = text.split(' ')
    const lineHeight = 30
    let line = ''
    let y = 50

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' '
      const metrics = ctx.measureText(testLine)
      const testWidth = metrics.width

      if (testWidth > canvas.width && n > 0) {
        ctx.fillText(line, 10, y)
        line = words[n] + ' '
        y += lineHeight
      } else {
        line = testLine
      }
    }

    ctx.fillText(line, 20, y)
  }

  return {
    // ...item,
    name: item.text,
    top: item.top * scale,
    left: item.left * scale,
    canvas: canvas,
  }
}

let timerInterval: any
let time = 0

self.addEventListener('message', async ({ data }) => {
  const { type, timestamp, value } = data

  validateMessage(data)

  console.log(
    `It took %d ms to send this message (main → worker, type: %o)`,
    Date.now() - timestamp,
    type,
  )
  try {
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

      // for (const [index, child] of children?.entries() ?? []) {
      //   self.postMessage(createMessage('Children', child))
      // }

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
      const {
        originalFile,
        box,
        targetBoxWidth,
        scriptGroup,
        buffer,
        isPsb,
        fileName,
      } = value as {
        originalFile: {
          pixelData: Uint8ClampedArray
          width: number
          height: number
          layerCount: number
          psd: AgPsd
        } | null
        fileName: string
        box: BalloonType[]
        scriptGroup: AgLayer | undefined | null
        targetBoxWidth: number
        buffer: ArrayBuffer
        isPsb: boolean
      }

      const agPsd = readPsd(buffer, {
        // skipLayerImageData: true,
        // useImageData: true,
        skipThumbnail: true,
      })

      if (originalFile) {
        const scale = originalFile.width / targetBoxWidth

        let newGroup = [...(scriptGroup?.children || [])]
        let originalPsd = { ...agPsd }

        let copyOriginalGroup =
          originalPsd.children?.find(value => value.name == '대사') ??
          DefaultGroup

        if (box.length > 0) {
          const promises = box.map(async (item, index) => {
            return createCanvasWithText(item, scale)
          })

          newGroup = await Promise.all(promises)
        }
        let resultGroup = {
          ...copyOriginalGroup,
          children: newGroup,
          name: 'Script result',
        }

        if (originalPsd.children) {
          originalPsd.children.push(resultGroup)
        } else {
          originalPsd.children = [resultGroup]
        }

        const arrayBuffer = writePsd(originalPsd, {
          psb: isPsb,
        })

        const blob = new Blob([arrayBuffer], {
          type: 'application/octet-stream',
        })

        self.postMessage(
          createMessage('DownloadFile', { file: blob, fileName: fileName }),
        )
      }
    } else {
      console.error(`Worker received a message that it cannot handle: %o`, data)
    }
  } catch (error: any) {
    self.postMessage(createMessage('Error', error.message))
  }
})
