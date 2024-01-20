'use client'

import {
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Switch,
} from '@mui/material'
import { useDropzone } from 'react-dropzone'
import { useEffect, useRef, useState, MouseEvent } from 'react'
import Psd, { Group } from '@webtoon/psd'
import { BoxType, createMessage, validateMessage } from '@/app/messaging'

import Balloon from '@/app/components/Balloon'
import Image from 'next/image'

export interface BalloonType {
  id: string
  left: number
  top: number
  text: string
  width: number
  height: number
}

const WorkSpace = () => {
  const workerRef = useRef<Worker>()
  const lastCalledRef = useRef<number>(0)
  const [isSynced, setIsSynced] = useState(false)
  const [addText, setAddText] = useState(false)
  const [image, setImage] = useState<any | null>(null)
  const [resizing, setResizing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [scriptGroup, setScriptGroup] = useState<Group | null>(null)

  const boundaryRef = useRef<HTMLDivElement>(null)

  const [balloons, setBalloons] = useState<BalloonType[]>([])

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!addText) return
    if (resizing) return

    const rect = (e.target as HTMLElement).getBoundingClientRect()

    const newBalloon = {
      id: Math.random().toString(),
      left: e.clientX - rect.left,
      top: e.clientY - rect.top,
      text: '',
      width: 150,
      height: 100,
      type: 'BALLOON',
    }
    setBalloons(prevBalloons => [...prevBalloons, newBalloon])
  }

  const handleDelete = (id: string, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setBalloons(prevBalloons =>
      prevBalloons.filter(balloon => balloon.id !== id),
    )
  }

  const handleTextChange = (id: string, newText: string) => {
    setBalloons(prevBalloons =>
      prevBalloons.map(balloon =>
        balloon.id === id ? { ...balloon, text: newText } : balloon,
      ),
    )
  }

  const onClickExport = () => {
    if (workerRef.current) {
      workerRef.current.postMessage(
        createMessage('WriteFile', {
          originalFile: image,
          box: balloons,
          group: scriptGroup,
        }),
      )
    }
  }

  const workerCallback = (
    { data }: MessageEvent<any>,
    element: HTMLDivElement[],
  ) => {
    const { type, timestamp, value } = data
    validateMessage(data)

    // console.log(
    //   `It took %d ms to send this message (worker → main, type: %o)`,
    //   Date.now() - timestamp,
    //   type,
    // )

    if (type === 'Layer') {
      const layer = value

      // -- Layers --
      // element.insertAdjacentHTML('beforeend', `<h3>${layer.name}</h3>`)
      // element.insertAdjacentHTML(
      //   'beforeend',
      //   `<div><p class="layer-info">size : ${layer.width} x ${layer.height} | top: ${layer.top} | left: ${layer.left}</p></div>`,
      // )
      // console.time('Create and append <canvas> for layer')
      // element.appendChild(generateCanvas(layer))
      // console.timeEnd('Create and append <canvas> for layer')
    } else if (type === 'MainImageData') {
      const image = value

      setImage(image)
      element.map(value => {
        value.appendChild(generateCanvas(image))
      })
    } else if (type === 'Group') {
      const layer = value
      const targetBox = boundaryRef.current?.getBoundingClientRect()
      if (!targetBox) {
        throw new Error('Target box not found')
      }

      const targetBoxWidth = targetBox.width
      const scale = targetBoxWidth / layer.originalWidth

      setScriptGroup(layer.group)
      console.log(layer)

      layer.box.map((value: BoxType) => {
        setBalloons(prevState => {
          return [
            ...prevState,
            {
              id: Math.random().toString(),
              text: value.name,
              left: value.left * scale,
              top: value.top * scale,
              width: 200,
              height: 150,
              // width: value.width * scale,
              // height:
              //   value.height * (scale / 1.1) > 500
              //     ? 500
              //     : value.height * (scale / 1.1),
            },
          ]
        })
      })
      setIsLoading(false)
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
    // const scale = targetBox.width / width
    // const newWidth = Math.round(width * scale)
    // const newHeight = Math.round(height * scale)
    const imageData = new ImageData(rgba, width, height)

    // canvasEl.width = newWidth
    // canvasEl.height = newHeight
    canvasEl.width = width
    canvasEl.height = height

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

  const { getRootProps, getInputProps } = useDropzone({
    multiple: false,
    accept: {
      // 'image/*': ['.png', '.jpg', '.jpeg'],
      'image/vnd.adobe.photoshop': ['.psd', '.psb'],
      // 'application/pdf': ['.pdf'],
    },
    onDrop: async (acceptedFiles: File[]) => {
      if (workerRef.current) {
        readFileAsArrayBuffer(acceptedFiles[0]).then(buffer => {
          setIsLoading(true)
          workerRef.current?.postMessage(createMessage('ParseData', buffer), [
            buffer,
          ])
        })

        const targetEl = document.querySelector('#target') as HTMLDivElement
        const sourceEl = document.querySelector('#source') as HTMLDivElement
        setBalloons([])
        if (targetEl.firstChild && sourceEl.firstChild) {
          targetEl.removeChild(targetEl.firstChild as Node)
          sourceEl.removeChild(sourceEl.firstChild as Node)
        }
      }
    },
  })

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('/src/app/worker.ts', import.meta.url),
    )

    const targetEl = document.querySelector('#target') as HTMLDivElement
    const sourceEl = document.querySelector('#source') as HTMLDivElement

    workerRef.current.addEventListener('message', (e: MessageEvent<any>) => {
      workerCallback(e, [targetEl, sourceEl])
      // workerCallback(e, sourceEl)
    })
  }, [])

  useEffect(() => {
    const source = document.getElementById('source')
    const target = document.getElementById('target')

    if (source && target) {
      const syncScroll = (e: any) => {
        const other = e.target === source ? target : source
        if (isSynced) {
          other.scrollTop = e.target.scrollTop
        }
      }

      source.addEventListener('scroll', syncScroll)
      target.addEventListener('scroll', syncScroll)

      return () => {
        source.removeEventListener('scroll', syncScroll)
        target.removeEventListener('scroll', syncScroll)
      }
    }
  }, [isSynced])

  // useEffect(() => {
  //   const updateTargetWidth = () => {
  //     const boundary = boundaryRef.current?.getBoundingClientRect()
  //     if (boundary) {
  //       // Only update the original target width if it hasn't been set yet
  //       if (originalTargetWidth === 0) {
  //         setOriginalTargetWidth(boundary.width)
  //       }
  //       setTargetWidth(boundary.width)
  //     }
  //   }

  //   updateTargetWidth()
  //   window.addEventListener('resize', updateTargetWidth)

  //   return () => {
  //     window.removeEventListener('resize', updateTargetWidth)
  //   }
  // }, [originalTargetWidth])

  // // Update balloon positions when the target box width changes
  // useEffect(() => {
  //   if (originalTargetWidth !== 0 && image) {
  //     console.log(originalTargetWidth, targetWidth, image.width)
  //     const imageRatio = image.width / originalTargetWidth
  //     setBalloons(prevBalloons =>
  //       prevBalloons.map(balloon => {
  //         let newLeft = balloon.left * (targetWidth / originalTargetWidth)
  //         // Ensure newLeft is within the range [12, targetWidth - 12]
  //         newLeft = Math.max(12, newLeft)
  //         newLeft = Math.min(newLeft, targetWidth - 12)
  //         return {
  //           ...balloon,
  //           left: newLeft,
  //         }
  //       }),
  //     )
  //   }
  // }, [targetWidth, originalTargetWidth, image])

  console.log(isLoading)

  return (
    // <main className={styles.main}>
    <>
      {isLoading && (
        <Box
          sx={{
            position: 'fixed',
            zIndex: 9999,
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {/* <Box
            sx={{
              border: '16px solid #f3f3f3',
              borderTop: '16px solid #3498db',
              borderRadius: '50%',
              width: '120px',
              height: '120px',
              animation: 'spin 2s linear infinite',
            }}
          ></Box> */}
          {/* <Image
            src='/pulse-loading.svg' // 이미지의 경로를 지정합니다.
            alt='Loading'
            width={120} // 이미지의 너비를 지정합니다.
            height={120} // 이미지의 높이를 지정합니다.
          /> */}
          <CircularProgress disableShrink sx={{ mt: 6 }} />
        </Box>
      )}

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
          >
            <Box
              // sx={{ ...style }}
              {...getRootProps({ className: 'dropzone' })}
              id='upload'
            >
              <input {...getInputProps()} />
              {/* <p>Drag 'n' drop some files here, or click to select files</p> */}
              <Button>File upload</Button>
              {/* <input type='file' accept='.psd,.psb' id='selectFile' /> */}
            </Box>
          </Box>
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
                  checked={isSynced}
                  onChange={() => setIsSynced(!isSynced)}
                  disabled={image === null}
                />
              }
              label='Sync scroll'
              sx={{ minWidth: '180px', paddingTop: 1 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={addText}
                  onChange={() => setAddText(!addText)}
                  disabled={image === null}
                />
              }
              label='Add Text Box'
              sx={{ minWidth: '180px', paddingTop: 1 }}
            />
            <Button
              onClick={onClickExport}
              // onClick={clickEvent.onClickSaveButton}
              // disabled={!values.selectedImageFile}
            >
              Export
            </Button>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', width: '100%' }}>
          <Box
            id='source'
            sx={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              // height: '100vh',
              maxWidth: '50vw',
              margin: '0 auto',
              overflow: 'auto',

              border: '1px solid',
              '::-webkit-scrollbar': { display: 'none' },
            }}
          ></Box>

          {/* <section>
          <div className='section-content'> */}
          <Box
            id='target'
            // ref={drop}
            ref={boundaryRef}
            onClick={handleClick}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              maxWidth: '50vw',
              // height: image ? image.height : '100%',
              margin: '0 auto',
              cursor: addText ? 'copy' : 'default',
              position: 'relative',
              overflow: 'auto',
              // overflow: 'auto',
              border: '1px solid',

              '::-webkit-scrollbar': {
                display: 'none',
              },
            }}
          >
            {balloons.map(balloon => (
              <Balloon
                key={balloon.id}
                {...balloon}
                onDelete={handleDelete}
                handleTextChange={handleTextChange}
                setBalloons={setBalloons}
                boundaryRef={boundaryRef}
                setResizing={setResizing}
                image={image}
              />
            ))}
          </Box>
          {/* </div>
        </section> */}
        </Box>
      </Box>
    </>
  )
}

export default WorkSpace
