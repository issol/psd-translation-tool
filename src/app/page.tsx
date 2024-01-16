'use client'
import Image from 'next/image'
import styles from './page.module.css'
import { Box, Button, FormControlLabel, Switch } from '@mui/material'
import { useDropzone } from 'react-dropzone'
import { useEffect, useMemo, useRef, useState } from 'react'
import Psd from '@webtoon/psd'
import { createMessage, validateMessage } from './messaging'

const baseStyle = {
  flex: 1,
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '20px',
  borderWidth: 2,
  borderRadius: 2,
  borderColor: '#eeeeee',
  borderStyle: 'dashed',
  backgroundColor: '#fafafa',
  color: '#bdbdbd',
  outline: 'none',
  transition: 'border .24s ease-in-out',
}

const focusedStyle = {
  borderColor: '#2196f3',
}

const acceptStyle = {
  borderColor: '#00e676',
}

const rejectStyle = {
  borderColor: '#ff1744',
}

export default function Home() {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const url = new URL('./worker.ts', import.meta.url)
  const workerRef = useRef<Worker>()

  // const worker = new SimpleWorker()

  const workerCallback = (
    { data }: MessageEvent<any>,
    element: HTMLDivElement,
  ) => {
    const { type, timestamp, value } = data
    validateMessage(data)

    console.log(
      `It took %d ms to send this message (worker → main, type: %o)`,
      Date.now() - timestamp,
      type,
    )

    if (type === 'Layer') {
      const layer = value

      // -- Layers --
      // element.insertAdjacentHTML('beforeend', `<h3>${layer.name}</h3>`)
      // element.insertAdjacentHTML(
      //   'beforeend',
      //   `<div><p class="layer-info">size : ${layer.width} x ${layer.height} | top: ${layer.top} | left: ${layer.left}</p></div>`,
      // )
      // console.time('Create and append <canvas> for layer')
      element.appendChild(generateCanvas(layer))
      console.timeEnd('Create and append <canvas> for layer')
    }
  }

  const generateCanvas = (data: {
    pixelData: Uint8ClampedArray
    width: number
    height: number
  }) => {
    const canvasEl = document.createElement('canvas')
    const context = canvasEl.getContext('2d') as CanvasRenderingContext2D

    const { width, height, pixelData: rgba } = data
    const imageData = context.createImageData(width, height)

    canvasEl.width = width
    canvasEl.height = height

    imageData.data.set(rgba)
    context.putImageData(imageData, 0, 0)

    return canvasEl
  }

  const readFileAsArrayBuffer = (file: File) => {
    if (file.arrayBuffer) {
      return file.arrayBuffer()
    } else {
      const reader = new FileReader()
      reader.readAsArrayBuffer(file)

      return new Promise<ArrayBuffer>(resolve => {
        reader.addEventListener('load', event => {
          if (event.target) {
            resolve(event.target.result as ArrayBuffer)
          } else {
            throw new Error('Loaded file but event.target is null')
          }
        })
      })
    }
  }

  const { getRootProps, getInputProps, isFocused, isDragAccept, isDragReject } =
    useDropzone({
      multiple: false,
      accept: {
        // 'image/*': ['.png', '.jpg', '.jpeg'],
        'image/vnd.adobe.photoshop': ['.psd', '.psb'],
        // 'application/pdf': ['.pdf'],
      },
      onDrop: async (acceptedFiles: File[]) => {
        if (workerRef.current) {
          readFileAsArrayBuffer(acceptedFiles[0]).then(buffer => {
            console.log(buffer)

            workerRef.current?.postMessage(createMessage('ParseData', buffer), [
              buffer,
            ])
          })
          const resultsEl = document.querySelector('#results') as HTMLDivElement
          resultsEl.innerHTML = ''
        }

        // console.log(acceptedFiles)
        // const result = await acceptedFiles[0].arrayBuffer()
        // const psdFile = Psd.parse(result)
        // const canvasElement = document.createElement('canvas')
        // const context = canvasElement.getContext('2d')
        // const compositeBuffer = await psdFile.composite()
        // const imageData = new ImageData(
        //   compositeBuffer,
        //   psdFile.width,
        //   psdFile.height,
        // )
        // canvasElement.width = psdFile.width
        // canvasElement.height = psdFile.height
        // const blob = new Blob([imageData.data.buffer], { type: 'image/png' })
        // const url = URL.createObjectURL(blob)
        // setImageSrc(url)
        // context?.putImageData(imageData, 0, 0)
        // document.body.append(canvasElement)
      },
    })

  const style = useMemo(
    () => ({
      ...baseStyle,
      ...(isFocused ? focusedStyle : {}),
      ...(isDragAccept ? acceptStyle : {}),
      ...(isDragReject ? rejectStyle : {}),
    }),
    [isFocused, isDragAccept, isDragReject],
  )

  useEffect(() => {
    workerRef.current = new Worker(new URL('./worker.ts', import.meta.url))

    const resultsEl = document.querySelector('#results') as HTMLDivElement

    workerRef.current.addEventListener('message', (e: MessageEvent<any>) => {
      workerCallback(e, resultsEl)
    })
  }, [])

  return (
    // <main className={styles.main}>
    <Box
      sx={{
        display: 'flex',
        position: 'relative',
        gap: 4,
        paddingTop: '75px',
        width: '100%',
      }}
    >
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,

          display: 'flex',
          backgroundColor: '#f5f5f5',
          width: '100%',

          zIndex: 101,
          paddingRight: '28px',

          height: '70px',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            color: 'green',
            gap: '4px',
            minWidth: '300px',
            justifyContent: 'flex-end',
            marginLeft: '15px',
            paddingTop: '1px',
            width: '300px',
            alignItems: 'center',
          }}
        ></Box>
        <Box
          sx={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          <FormControlLabel
            control={
              <Switch
              // checked={values.addTextCheck}
              // onChange={setValue.handleAddTextCheckChange}
              // disabled={!values.selectedImageFile}
              />
            }
            label='Add Text Box'
            sx={{ minWidth: '180px', paddingTop: 1 }}
          />
          <Button
          // onClick={clickEvent.onClickSaveButton}
          // disabled={!values.selectedImageFile}
          >
            SAVE
          </Button>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', width: '100%' }}>
        {/* <Box
          sx={{
            display: 'flex',
            flex: 1,
            height: '100vh',
            margin: '0 auto',
            overflow: 'auto',

            border: '1px solid',
            '::-webkit-scrollbar': { display: 'none' },
          }}
        ></Box> */}
        <Box></Box>
        <Box sx={{ ...style }} {...getRootProps({ className: 'dropzone' })}>
          <input {...getInputProps()} />
          <p>Drag 'n' drop some files here, or click to select files</p>
          {/* <input type='file' accept='.psd,.psb' id='selectFile' /> */}
        </Box>
        <Box
          id='results'
          sx={{
            display: 'flex',
            flex: 1,
            // minWidth: '900px',
            // width: '900px',
            cursor: 'copy',
            position: 'relative',
            height: '100%',

            '::-webkit-scrollbar': {
              display: 'none',
            },
          }}
        ></Box>
      </Box>
    </Box>
  )
}
