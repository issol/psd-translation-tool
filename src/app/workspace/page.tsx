'use client'

import {
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  LinearProgress,
  Switch,
} from '@mui/material'
import { useDropzone } from 'react-dropzone'
import { useEffect, useRef, useState, MouseEvent, Fragment } from 'react'

import { BoxType, createMessage, validateMessage } from '@/app/messaging'
import { Psd as AgPsd, Layer as AgLayer, writePsd, readPsd } from 'ag-psd'

import Balloon from '@/app/components/Balloon'

import useModal from '@/app/hooks/useModal'
import Modal from '@/app/components/modal/custom-modal'
import { atom, useRecoilState } from 'recoil'

export interface BalloonType {
  idx: string
  left: number
  top: number
  text: string
  width: number
  height: number
}

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

const fileReadingState = atom({
  key: `fileReadingState-${Math.random()}`,
  default: false,
})

const textBoxReadingState = atom({
  key: `textBoxReadingState-${Math.random()}`,
  default: false,
})

const writeFileState = atom({
  key: `writeFileState-${Math.random()}`,
  default: false,
})

const progressState = atom({
  key: `progressState-${Math.random()}`,
  default: 0,
})

const WorkSpace = () => {
  const workerRef = useRef<Worker>()
  const { openModal, closeModal } = useModal()

  const [isSynced, setIsSynced] = useState(false)
  const [addText, setAddText] = useState(false)
  const [image, setImage] = useState<{
    pixelData: Uint8ClampedArray
    width: number
    height: number
    layerCount: number
    psd: AgPsd
  } | null>(null)
  const [resizing, setResizing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [scriptGroup, setScriptGroup] = useState<AgLayer | undefined | null>(
    null,
  )

  const [fileReading, setFileReading] = useRecoilState(fileReadingState)
  const [textBoxReading, setTextBoxReading] =
    useRecoilState(textBoxReadingState)
  const [writeFile, setWriteFile] = useRecoilState(writeFileState)

  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [conversionTime, setConversionTime] = useState<number | null>(null)
  const [progress, setProgress] = useRecoilState(progressState)
  const [group, setGroup] = useState<AgLayer[]>([])

  const canvasPool: HTMLCanvasElement[] = []

  const boundaryRef = useRef<HTMLDivElement>(null)

  const [balloons, setBalloons] = useState<BalloonType[]>([])

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!addText) return
    if (resizing) return

    const rect = (e.target as HTMLElement).getBoundingClientRect()

    const newBalloon = {
      idx: Math.random().toString(),
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
      prevBalloons.filter(balloon => balloon.idx !== id),
    )
  }

  const handleTextChange = (id: string, newText: string) => {
    setBalloons(prevBalloons =>
      prevBalloons.map(balloon =>
        balloon.idx === id ? { ...balloon, text: newText } : balloon,
      ),
    )
  }

  const generateCanvas = (data: {
    pixelData: Uint8ClampedArray | Uint8Array
    width: number
    height: number
  }) => {
    const canvasEl = document.createElement('canvas')

    const context = canvasEl.getContext('2d') as CanvasRenderingContext2D

    const { width, height, pixelData: rgba } = data
    let result: Uint8ClampedArray | Uint8Array =
      rgba instanceof Uint8Array ? new Uint8ClampedArray(rgba.buffer) : rgba

    const imageData = new ImageData(result, width, height)

    canvasEl.width = width
    canvasEl.height = height

    context.putImageData(imageData, 0, 0)

    return canvasEl
  }
  function replaceMatchingLayers(
    group: AgLayer,
    layerIncludeCanvas: AgLayer[],
    isChild?: boolean,
  ): [AgLayer, AgLayer[]] {
    if (group.children) {
      console.log(group)

      group.children = group.children.map(child => {
        const matchingLayer = layerIncludeCanvas.find(
          layer => layer.name === child.name,
        )
        if (matchingLayer) {
          // Remove the matching layer from layerIncludeCanvas
          layerIncludeCanvas = layerIncludeCanvas.filter(
            layer => layer.name !== matchingLayer.name,
          )
          // Replace the child with the matching layer

          return matchingLayer
        } else if (child.children) {
          // Recursively process the child's children
          const [updatedChild, updatedLayerIncludeCanvas] =
            replaceMatchingLayers(child, layerIncludeCanvas, true)
          layerIncludeCanvas = updatedLayerIncludeCanvas
          return updatedChild
        }

        return child
      })
      !isChild && layerIncludeCanvas.push(group)
    }
    return [group, layerIncludeCanvas]
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

  const createCanvasWithText = (item: BalloonType, scale: number) => {
    setTextBoxReading(true)
    const canvas = document.createElement('canvas')
    canvas.width = item.width * scale + 15
    canvas.height = item.height * scale

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

  function getCanvasFromPool(): HTMLCanvasElement {
    if (canvasPool.length > 0) {
      return canvasPool.pop() as HTMLCanvasElement
    } else {
      return document.createElement('canvas')
    }
  }

  function returnCanvasToPool(canvas: HTMLCanvasElement) {
    canvasPool.push(canvas)
  }

  async function addCanvasToChildren(node: AgLayer): Promise<AgLayer> {
    let newNode = { ...node }

    if (newNode.imageData) {
      const canvasEl = getCanvasFromPool()
      const context = canvasEl.getContext('2d') as CanvasRenderingContext2D
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
      } else {
        returnCanvasToPool(canvasEl)
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

  const handleCopyLayerStyle = async () => {
    if (file && image) {
      let agPsd = image.psd
      if (group.length > 0) {
        const promises = group.map(addCanvasToChildren)

        agPsd.children = await Promise.all(promises)
        setFileReading(false)
      }
      console.log(agPsd)

      if (boundaryRef.current) {
        const targetBox = boundaryRef.current?.getBoundingClientRect()
        if (targetBox && image) {
          setTextBoxReading(true)
          const targetBoxWidth = targetBox.width
          const scale = image.width / targetBoxWidth

          let newGroup = [...(scriptGroup?.children || [])]

          let originalPsd = { ...agPsd }
          let copyOriginalGroup =
            originalPsd.children?.find(value => value.name == '대사') ??
            DefaultGroup

          if (balloons.length > 0) {
            const promises = balloons.map(async (item, index) => {
              return createCanvasWithText(item, scale)
            })

            newGroup = await Promise.all(promises)
            setTextBoxReading(false)
          }

          let resultGroup = {
            ...copyOriginalGroup,
            children: newGroup,
            name: '대사 카피',
          }
          if (originalPsd.children) {
            originalPsd.children.push(resultGroup)
          } else {
            originalPsd.children = [resultGroup]
          }
          setWriteFile(true)

          const arrayBuffer = writePsd(originalPsd)

          const blob = new Blob([arrayBuffer], {
            type: 'application/octet-stream',
          })

          const a = document.createElement('a')
          a.href = URL.createObjectURL(blob)
          a.textContent = 'Download generated PSD'
          a.download = 'example_psd.psd'
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)

          setWriteFile(false)
        }
      }
    } else {
      setFileReading(false)
    }
  }

  // // const handleCopyLayerStyle = async () => {
  // //   setExportLoading(true)
  // //   if (file) {
  // //     setFileReading(true)
  // //     const buffer = await readFileAsArrayBuffer(file)
  // //     const agPsd = readPsd(buffer, {
  // //       skipThumbnail: true,
  // //     })
  // //     setFileReading(false)

  // //     if (boundaryRef.current) {
  // //       setTextBoxReading(true)
  // //       const targetBox = boundaryRef.current?.getBoundingClientRect()
  // //       if (targetBox && image) {
  // //         const targetBoxWidth = targetBox.width
  // //         const scale = image.width / targetBoxWidth

  // //         let newGroup = [...(scriptGroup?.children || [])] // group과 똑같은 배열을 복사합니다.

  // //         let originalPsd = { ...agPsd }
  // //         let copyOriginalGroup =
  // //           originalPsd.children?.find(value => value.name == '대사') ??
  // //           DefaultGroup

  // //         if (balloons.length > 0 && newGroup.length > 0) {
  // //           const promises = newGroup.map(async (item, index) => {
  // //             const canvas = document.createElement('canvas')
  // //             canvas.width = balloons[index].width * scale // Set the width of the canvas
  // //             canvas.height = balloons[index].height * scale // Set the height of the canvas

  // //             const ctx = canvas.getContext('2d')

  // //             if (ctx) {
  // //               ctx.fillStyle = 'white' // Set the fill color to white
  // //               ctx.fillRect(0, 0, canvas.width, canvas.height) // Fill the canvas with the fill color

  // //               ctx.strokeStyle = 'black' // Set the border color to black
  // //               ctx.lineWidth = 5 // Set the border width
  // //               ctx.strokeRect(0, 0, canvas.width, canvas.height)

  // //               ctx.font = '30px Arial' // Set the font size and family
  // //               ctx.fillStyle = 'black'
  // //               const text = balloons[index].text
  // //               const words = text.split(' ')
  // //               const lineHeight = 30
  // //               let line = ''
  // //               let y = 50

  // //               for (let n = 0; n < words.length; n++) {
  // //                 const testLine = line + words[n] + ' '
  // //                 const metrics = ctx.measureText(testLine)
  // //                 const testWidth = metrics.width

  // //                 if (testWidth > canvas.width && n > 0) {
  // //                   ctx.fillText(line, 10, y)
  // //                   line = words[n] + ' '
  // //                   y += lineHeight
  // //                 } else {
  // //                   line = testLine
  // //                 }
  // //               }

  // //               ctx.fillText(line, 20, y)
  // //             }

  // //             return {
  // //               ...item,
  // //               name: balloons[index].text, // name을 바꿉니다.
  // //               top: balloons[index].top * scale, // top을 바꿉니다.
  // //               left: balloons[index].left * scale, // left를 바꿉니다.

  // //               canvas: canvas,
  // //               // canvas: matchingChild ? matchingChild.canvas : undefined, // Add the canvas from the matching child
  // //             }
  // //           })

  // //           newGroup = await Promise.all(promises)
  // //         } else if (balloons.length > 0 && newGroup.length === 0) {
  // //           const promises = balloons.map(async (item, index) => {
  // //             const canvas = document.createElement('canvas')
  // //             canvas.width = item.width * scale // Set the width of the canvas
  // //             canvas.height = item.height * scale // Set the height of the canvas

  // //             const ctx = canvas.getContext('2d')

  // //             if (ctx) {
  // //               ctx.fillStyle = 'white' // Set the fill color to white
  // //               ctx.fillRect(0, 0, canvas.width, canvas.height) // Fill the canvas with the fill color

  // //               ctx.strokeStyle = 'black' // Set the border color to black
  // //               ctx.lineWidth = 5 // Set the border width
  // //               ctx.strokeRect(0, 0, canvas.width, canvas.height)

  // //               ctx.font = '30px Arial' // Set the font size and family
  // //               ctx.fillStyle = 'black'
  // //               const text = item.text
  // //               const words = text.split(' ')
  // //               const lineHeight = 30
  // //               let line = ''
  // //               let y = 50

  // //               for (let n = 0; n < words.length; n++) {
  // //                 const testLine = line + words[n] + ' '
  // //                 const metrics = ctx.measureText(testLine)
  // //                 const testWidth = metrics.width

  // //                 if (testWidth > canvas.width && n > 0) {
  // //                   ctx.fillText(line, 10, y)
  // //                   line = words[n] + ' '
  // //                   y += lineHeight
  // //                 } else {
  // //                   line = testLine
  // //                 }
  // //               }

  // //               ctx.fillText(line, 20, y)
  // //             }

  // //             return {
  // //               name: item.text, // name을 바꿉니다.
  // //               top: item.top * scale, // top을 바꿉니다.
  // //               left: item.left * scale, // left를 바꿉니다.

  // //               canvas: canvas,
  // //               // canvas: matchingChild ? matchingChild.canvas : undefined, // Add the canvas from the matching child
  // //             }
  // //           })

  // //           newGroup = await Promise.all(promises)
  // //         }
  // //         setTextBoxReading(false)

  // //         let resultFile
  // //         let resultGroup

  // //         resultGroup = {
  // //           ...copyOriginalGroup,
  // //           children: newGroup,
  // //           name: '대사 카피',
  // //         }
  // //         if (originalPsd.children) {
  // //           originalPsd.children.push(resultGroup)
  // //         } else {
  // //           originalPsd.children = [resultGroup]
  // //         }
  // //         setWriteFile(true)
  // //         const arrayBuffer = writePsd(originalPsd)

  // //         const blob = new Blob([arrayBuffer], {
  // //           type: 'application/octet-stream',
  // //         })

  // //         const a = document.createElement('a')
  // //         a.href = URL.createObjectURL(blob)
  // //         a.textContent = 'Download generated PSD'
  // //         a.download = 'example_psd.psd'
  // //         document.body.appendChild(a)
  // //         setWriteFile(false)

  // //         a.click()
  // //         setExportLoading(false)
  // //       }
  // //     }
  // //   }
  // // }

  const onClickExport = () => {
    openModal({
      type: 'SameLayerModal',
      children: (
        <Modal
          onClick={() => {
            closeModal('SameLayerModal')
            setFileReading(true)
            setTimeout(() => {
              handleCopyLayerStyle()
            }, 1000)
          }}
          onClose={() => closeModal('SameLayerModal')}
          rightButtonText='Yes'
          leftButtonText='No'
          title='Test'
        />
      ),
    })
    // }
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
      // element[2].insertAdjacentHTML('beforeend', `<h3>${layer.name}</h3>`)
      // element[2].insertAdjacentHTML(
      //   'beforeend',
      //   `<div><p class="layer-info">size : ${layer.width} x ${layer.height} | top: ${layer.top} | left: ${layer.left}</p></div>`,
      // )
      // console.time('Create and append <canvas> for layer')
      // element[2].appendChild(generateCanvas(layer))
      // console.timeEnd('Create and append <canvas> for layer')
    } else if (type === 'Children') {
      const image = value as AgLayer
      setGroup(prevState => [...prevState, image])
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

      layer.box.map((value: BoxType) => {
        setBalloons(prevState => {
          return [
            ...prevState,
            {
              idx: Math.random().toString(),
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
    } else if (type === 'DownloadFile') {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(value)
      a.textContent = 'Download generated PSD'
      a.download = 'example_psd.psd'
      document.body.appendChild(a)

      a.click()
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
          console.log(buffer)

          setBuffer(buffer)
          setFile(acceptedFiles[0])
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
    // const layerEl = document.querySelector('#layer') as HTMLDivElement

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
  // useEffect(() => {
  //   console.log(fileReading, textBoxReading, writeFile, progress)

  //   let timer: NodeJS.Timeout
  //   if (fileReading && progress < 40) {
  //     timer = setInterval(() => {
  //       console.log('hihi')

  //       setProgress(oldProgress => Math.min(oldProgress + 1, 40))
  //     }, 1000)
  //   } else if (textBoxReading && progress < 80) {
  //     timer = setInterval(() => {
  //       setProgress(oldProgress => Math.min(oldProgress + 1, 80))
  //     }, 1000)
  //   } else if (writeFile && progress < 100) {
  //     timer = setInterval(() => {
  //       setProgress(oldProgress => Math.min(oldProgress + 1, 100))
  //     }, 1000)
  //   }
  //   return () => {
  //     clearInterval(timer)
  //   }
  // }, [fileReading, textBoxReading, writeFile])

  return (
    // <main className={styles.main}>
    <>
      {fileReading && (
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
          <Box sx={{ border: '1px solid', width: '500px' }}>
            <LinearProgress color='success' />
          </Box>
          File Reading...
        </Box>
      )}
      {textBoxReading && (
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
          <LinearProgress />
          Text box reading...
        </Box>
      )}
      {/* {(fileReading || textBoxReading || writeFile) && (
        
      )} */}
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
          {conversionTime && (
            <div>Conversion Time: {conversionTime ?? 0} ms</div>
          )}
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
              // <Box id={`balloon-${balloon.idx}`} key={balloon.idx}>
              <Balloon
                key={balloon.idx}
                {...balloon}
                onDelete={handleDelete}
                handleTextChange={handleTextChange}
                setBalloons={setBalloons}
                boundaryRef={boundaryRef}
                setResizing={setResizing}
              />
              // </Box>
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
