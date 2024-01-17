import Psd from '@webtoon/psd'
import { createMessage, validateMessage } from './messaging'

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
      }),
    )

    for (const [index, layer] of psd.layers.entries()) {
      console.time(`Compositing layer ${index}`)
      const pixelData = await layer.composite(true, true)
      console.timeEnd(`Compositing layer ${index}`)
      self.postMessage(
        createMessage('Layer', {
          pixelData,
          name: layer.name,
          left: layer.left,
          top: layer.top,
          width: layer.width,
          height: layer.height,
        }),
        // [pixelData.buffer],
      )
    }
  } else {
    console.error(`Worker received a message that it cannot handle: %o`, data)
  }
})
