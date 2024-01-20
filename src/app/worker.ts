import Psd, { Group, Layer } from '@webtoon/psd'
import { createMessage, validateMessage } from './messaging'
import { writePsd } from 'ag-psd'

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
    const psd = Psd.parse(value)
    console.timeEnd('Parse PSD file')

    console.log(psd)

    const pixelData = await psd.composite()
    self.postMessage(
      createMessage('MainImageData', {
        pixelData,

        width: psd.width,
        height: psd.height,
        layerCount: psd.layers.length,
        psd: psd,
      }),
    )

    // for (const [index, layer] of psd.layers.entries()) {
    //   console.time(`Compositing layer ${index}`)
    //   const pixelData = await layer.composite(true, true)
    //   console.timeEnd(`Compositing layer ${index}`)
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

    let result: Array<{
      pixelData: Uint8ClampedArray
      left: number
      top: number
      width: number
      height: number
      /** Parsed layer name */
      name: string
    }> = []

    let originalGroup: Group | null = null

    for (const [index, child] of psd.children.entries()) {
      if (child.type === 'Group' && child.name === '대사') {
        // console.log(child.children.filter((layer) => layer.type === 'Group'))
        console.log(child)
        originalGroup = child

        for (const [index, layer] of child.children.entries()) {
          const value = layer as Layer

          result.push({
            pixelData,
            name: layer.name,
            left: value.left,
            top: value.top,
            width: value.width,
            height: value.height,
          })
        }
      }

      // const pixelData = await child.composite(true, true)
    }
    self.postMessage(
      createMessage('Group', {
        box: result,
        group: originalGroup,
        originalWidth: psd.width,
      }),
    )
  } else if (type === 'WriteFile') {
    const arrayBuffer = writePsd(value.originalFile)
    console.log(arrayBuffer)
  } else {
    console.error(`Worker received a message that it cannot handle: %o`, data)
  }
})
