import { createMessage, validateMessage } from './messaging'

declare const self: DedicatedWorkerGlobalScope

let timerInterval: any
let time = 0
let textIndex = 0
const textArray = [
  'The moment of creation, currently downloading. Please wait a moment.',
  'Creation takes time. Please be patient and give it a moment.',
  'Loading the project... Grab a cup of coffee and wait a bit!',
  'Pixels and colors are meeting... Just hold on for a moment.',
  'Data transmission in progress! It will be completed shortly.',
]

self.addEventListener('message', async ({ data }) => {
  const { type, timestamp, value } = data

  validateMessage(data)

  if (type === 'ProgressAction') {
    console.log(value)

    if (value === 'start') {
      self.postMessage(
        createMessage('Progress', 'Gearing Up for Your Download…'),
      )
      timerInterval = setInterval(() => {
        time += 1
        self.postMessage(createMessage('Progress', textArray[textIndex]))
        textIndex = (textIndex + 1) % textArray.length
      }, 3000)
    } else {
      self.postMessage(createMessage('Progress', null))
      clearInterval(timerInterval)
      time = 0
    }
  } else {
    console.error(`Worker received a message that it cannot handle: %o`, data)
  }
})
