'use client'

import {
  Box,
  Button,
  CircularProgress,
  ClickAwayListener,
  FormControlLabel,
  Grow,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  MenuList,
  Paper,
  Popper,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material'
import { useDropzone } from 'react-dropzone'
import { useEffect, useRef, useState, MouseEvent, Fragment } from 'react'

import { BoxType, createMessage, validateMessage } from '@/app/messaging'
import { Psd as AgPsd, Layer as AgLayer, writePsd, readPsd } from 'ag-psd'

import Balloon from '@/app/components/Balloon'

import useModal from '@/app/hooks/useModal'
import Modal from '@/app/components/modal/custom-modal'
import { atom, useRecoilState } from 'recoil'
import ClearIcon from '@mui/icons-material/Clear'
import ErrorModal from '../components/modal/error-modal'
import { hexToRGBA } from '../utils/hexToRGBA'
import styled from '@emotion/styled'
import NextImage from 'next/image'
import { Icon } from '@iconify/react'

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

const loadingStatusState = atom<string | null>({
  key: `loadingStatusState-${Math.random()}`,
  default: null,
})

const WorkSpace = () => {
  const workerRef = useRef<Worker>()
  const timerWorkerRef = useRef<Worker>()
  const inputRef = useRef<any>(null)

  const headerRef = useRef<any>(null)
  const fileMenuRef = useRef<HTMLDivElement>(null)
  const editMenuRef = useRef<HTMLDivElement>(null)
  const { openModal, closeModal } = useModal()

  const [open, setOpen] = useState(false)
  const [editMenuOpen, setEditMenuOpen] = useState(false)

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

  const [loadingStatus, setLoadingStatus] = useRecoilState(loadingStatusState)

  const [file, setFile] = useState<File | null>(null)

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

  const convertImageToCanvas = (
    file: File,
  ): Promise<HTMLCanvasElement | null> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = event => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(img, 0, 0, img.width, img.height)
          }
          resolve(canvas)
        }
        img.src = event.target?.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const createCanvasWithText = (item: BalloonType, scale: number) => {
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

  const handleCopyLayerStyle = async (
    filename: string,
    fileExtension: string,
  ) => {
    if (file) {
      readFileAsArrayBuffer(file).then(buffer => {
        if (
          workerRef.current &&
          image &&
          boundaryRef.current &&
          timerWorkerRef.current
        ) {
          const targetBox = boundaryRef.current?.getBoundingClientRect()
          console.log(file.name.includes('.psb'))

          const targetBoxWidth = targetBox.width

          timerWorkerRef.current.postMessage(
            createMessage('ProgressAction', 'start'),
          )
          workerRef.current.postMessage(
            createMessage('WriteFile', {
              originalFile: image,
              box: balloons,
              // group: group,
              targetBoxWidth: targetBoxWidth,
              scriptGroup: scriptGroup,
              buffer: buffer,
              isPsb: file.name.includes('.psb'),
              fileName: `${filename}.${fileExtension}`,
            }),
          )
        }
      })
    }
  }

  const onClickExport = () => {
    if (!image) return
    const fileExtension = file?.name.split('.').pop() ?? ''
    const fileName = file?.name.split('.').slice(0, -1).join('.') ?? ''

    openModal({
      type: 'SameLayerModal',
      children: (
        <Modal
          onClick={(filename: string, fileExtension: string) => {
            closeModal('SameLayerModal')

            handleCopyLayerStyle(filename, fileExtension)
          }}
          onClose={() => closeModal('SameLayerModal')}
          rightButtonText='Export'
          leftButtonText='Cancel'
          title='Export file'
          // filename={`${fileName}-result.${fileExtension}` ?? 'result.psd'}
          filename={`${fileName}-result` ?? `result`}
          fileExtension={fileExtension}
          subtitle='Do you want to export a file with a text layer?'
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
      const imageScale = layer.originalWidth / targetBoxWidth
      console.log(scale, imageScale)
      const defaultWidth = targetBoxWidth > layer.originalWidth ? 400 : 200
      const defaultHeight = targetBoxWidth > layer.originalWidth ? 300 : 150

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
              width: defaultWidth * imageScale,
              height: defaultHeight * imageScale,
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
    } else if (type === 'DownloadFile' && timerWorkerRef.current) {
      timerWorkerRef.current.postMessage(
        createMessage('ProgressAction', 'stop'),
      )
      const a = document.createElement('a')
      a.href = URL.createObjectURL(value.file)

      a.download = value.fileName ?? 'result.psd'
      document.body.appendChild(a)

      a.click()
      document.body.removeChild(a)
    } else if (type === 'Error') {
      setIsLoading(false)
      setLoadingStatus(null)
      console.error(value)
      openModal({
        type: 'ErrorModal',
        children: (
          <ErrorModal onClose={() => closeModal('ErrorModal')} value={value} />
        ),
      })
    }
  }

  const { getRootProps, getInputProps } = useDropzone({
    multiple: false,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'image/vnd.adobe.photoshop': ['.psd', '.psb'],
      // 'application/pdf': ['.pdf'],
    },
    onDrop: async (acceptedFiles: File[]) => {
      const fileExtension = acceptedFiles[0].name.split('.').pop() ?? null
      if (workerRef.current) {
        const targetEl = document.querySelector('#target') as HTMLDivElement
        const sourceEl = document.querySelector('#source') as HTMLDivElement
        setFile(acceptedFiles[0])
        if (
          fileExtension &&
          (fileExtension === 'psd' || fileExtension === 'psb')
        ) {
          readFileAsArrayBuffer(acceptedFiles[0]).then(buffer => {
            setIsLoading(true)
            console.log(buffer)

            workerRef.current?.postMessage(createMessage('ParseData', buffer), [
              buffer,
            ])
          })

          setBalloons([])
        } else if (
          fileExtension &&
          (fileExtension === 'png' ||
            fileExtension === 'jpg' ||
            fileExtension === 'jpeg')
        ) {
          ;[targetEl, sourceEl].map(async value => {
            const canvas = await convertImageToCanvas(acceptedFiles[0])
            if (canvas) {
              value.appendChild(canvas)
              // sourceEl.appendChild(canvas)
            }
          })
        } else if (fileExtension && fileExtension === 'pdf') {
        }

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
    timerWorkerRef.current = new Worker(
      new URL('/src/app/timer-worker.ts', import.meta.url),
    )

    const targetEl = document.querySelector('#target') as HTMLDivElement
    const sourceEl = document.querySelector('#source') as HTMLDivElement
    // const layerEl = document.querySelector('#layer') as HTMLDivElement

    workerRef.current.addEventListener('message', (e: MessageEvent<any>) => {
      workerCallback(e, [targetEl, sourceEl])
      // workerCallback(e, sourceEl)
    })

    timerWorkerRef.current.addEventListener(
      'message',
      (e: MessageEvent<any>) => {
        const { type, timestamp, value } = e.data
        validateMessage(e.data)

        if (type === 'Progress') {
          setLoadingStatus(value)
        }
      },
    )
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

  useEffect(() => {
    function handleClickOutside(event: any) {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    // Bind the event listener
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

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

  const handleToggle = (menu: string) => {
    if (menu === 'file') {
      setOpen(prevOpen => !prevOpen)
    } else if (menu === 'edit') {
      setEditMenuOpen(prevOpen => !prevOpen)
    }
  }

  const handleClose = (event: Event | React.SyntheticEvent, menu: string) => {
    if (menu === 'file') {
      if (
        fileMenuRef.current &&
        fileMenuRef.current.contains(event.target as HTMLElement)
      ) {
        return
      }
      setOpen(false)
    } else if (menu === 'edit') {
      if (
        editMenuRef.current &&
        editMenuRef.current.contains(event.target as HTMLElement)
      ) {
        return
      }
      setEditMenuOpen(false)
    }
  }

  function handleListKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Tab') {
      event.preventDefault()
      setOpen(false)
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  const handleOpen = () => {
    inputRef.current?.click()
  }

  return (
    // <main className={styles.main}>
    <>
      {loadingStatus && (
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
            padding: '24px',
          }}
        >
          <Box
            sx={{
              width: '300px',
              backgroundColor: 'rgba(255,255,255,0.01)',

              borderRadius: '10px', // 테두리를 둥글게 설정
              boxShadow: 3, // 그림자 효과를 추가
              p: 2, // 패딩을 추가
            }}
          >
            <LinearProgress color='secondary' />
            <Typography
              color='#ffffff'
              fontSize={16}
              fontWeight={500}
              lineHeight='20px'
              padding='10px'
              mt='10px'
            >
              {loadingStatus}
            </Typography>
          </Box>
        </Box>
      )}

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
          <CircularProgress disableShrink sx={{ mt: 6 }} />
        </Box>
      )}

      <Box
        sx={{
          display: 'flex',
          // position: 'relative',
          // gap: 4,
          // paddingTop: '75px',
          width: '100%',
          flexDirection: 'column',
        }}
      >
        <Header ref={headerRef}>
          <Box
            sx={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              paddingLeft: '10px',
              flex: 1,
            }}
          >
            <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {' '}
              <IconButton
                onClick={() => {
                  window.location.reload()
                }}
              >
                <NextImage
                  src='/logo.svg'
                  width={24}
                  height={24}
                  alt='logo'
                  color='white'
                />
              </IconButton>
              <Typography color='white' fontWeight={700}>
                Glotoon
              </Typography>
              <Box
                ref={fileMenuRef}
                id='composition-button'
                aria-controls={open ? 'composition-menu' : undefined}
                aria-expanded={open ? 'true' : undefined}
                aria-haspopup='true'
                onClick={() => handleToggle('file')}
                sx={{
                  display: 'flex',
                  flex: 1,
                  margin: '4px',
                  // padding: '2px 5px 3px 5px',
                  paddingLeft: '10px',
                  paddingRight: '6px',
                  cursor: 'default',
                  color: '#ffffff',
                  fontWeight: 400,

                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.25)',
                    borderRadius: '3px',
                  },
                }}
              >
                File
              </Box>
              <Box
                ref={editMenuRef}
                id='composition-button'
                aria-controls={editMenuOpen ? 'composition-menu' : undefined}
                aria-expanded={editMenuOpen ? 'true' : undefined}
                aria-haspopup='true'
                onClick={() => handleToggle('edit')}
                sx={{
                  display: 'flex',
                  flex: 1,
                  margin: '4px',
                  // padding: '2px 5px 3px 5px',
                  paddingLeft: '10px',
                  paddingRight: '6px',
                  cursor: 'default',
                  color: '#ffffff',
                  fontWeight: 400,

                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.25)',
                    borderRadius: '3px',
                  },
                }}
              >
                Edit
              </Box>
            </Box>
          </Box>

          <Popper
            open={open}
            anchorEl={fileMenuRef.current}
            role={undefined}
            placement='bottom-start'
            transition
            disablePortal
          >
            {({ TransitionProps, placement }) => (
              <Grow
                {...TransitionProps}
                style={{
                  transformOrigin:
                    placement === 'bottom-start' ? 'left top' : 'left bottom',
                }}
              >
                <Paper>
                  <ClickAwayListener
                    onClickAway={event => handleClose(event, 'file')}
                  >
                    <MenuList
                      // autoFocusItem={open}
                      id='composition-menu'
                      aria-labelledby='composition-button'
                      onKeyDown={handleListKeyDown}
                      sx={{
                        backgroundColor: hexToRGBA('#666666', 0.9),
                        mt: 0.5,
                        paddingBottom: 0,
                        paddingTop: 0,
                      }}
                    >
                      <MenuItem
                        onClick={event => {
                          handleClose(event, 'file')
                          handleOpen()
                        }}
                        sx={{
                          // backgroundColor: hexToRGBA('#666666', 0.9),
                          width: '200px',
                          color: '#f0f0f0',
                          borderRadius: '4px',
                          marginLeft: '2px',
                        }}
                      >
                        New File...
                      </MenuItem>
                      <MenuItem
                        onClick={event => {
                          handleClose(event, 'file')
                          onClickExport()
                        }}
                        disabled={!image}
                        sx={{
                          width: '200px',
                          color: '#f0f0f0',
                          borderRadius: '4px',
                          marginLeft: '2px',
                        }}
                      >
                        Export as
                      </MenuItem>
                      {/* <MenuItem onClick={handleClose}>Logout</MenuItem> */}
                    </MenuList>
                  </ClickAwayListener>
                </Paper>
              </Grow>
            )}
          </Popper>
          <Popper
            open={editMenuOpen}
            anchorEl={editMenuRef.current}
            role={undefined}
            placement='bottom-start'
            transition
            disablePortal
          >
            {({ TransitionProps, placement }) => (
              <Grow
                {...TransitionProps}
                style={{
                  transformOrigin:
                    placement === 'bottom-start' ? 'left top' : 'left bottom',
                }}
              >
                <Paper>
                  <ClickAwayListener
                    onClickAway={event => handleClose(event, 'edit')}
                  >
                    <MenuList
                      // autoFocusItem={open}
                      id='composition-menu'
                      aria-labelledby='composition-button'
                      onKeyDown={handleListKeyDown}
                      sx={{
                        backgroundColor: hexToRGBA('#666666', 0.9),
                        mt: 0.5,
                        paddingBottom: 0,
                        paddingTop: 0,
                      }}
                    >
                      <MenuItem
                        onClick={event => {
                          // handleClose(event, 'edit')
                          setAddText(!addText)
                        }}
                        sx={{
                          // backgroundColor: hexToRGBA('#666666', 0.9),
                          width: '200px',
                          color: '#f0f0f0',
                          borderRadius: '4px',
                          marginLeft: '2px',
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                        disabled={!image}
                      >
                        Add text box
                        {addText ? (
                          <NextImage
                            src='/green-dot.svg'
                            alt='dot'
                            width='15'
                            height='15'
                          />
                        ) : (
                          ''
                        )}
                      </MenuItem>
                      <MenuItem
                        onClick={event => {
                          // handleClose(event, 'edit')
                          setIsSynced(!isSynced)
                        }}
                        disabled={!image}
                        sx={{
                          width: '200px',
                          color: '#f0f0f0',
                          borderRadius: '4px',
                          marginLeft: '2px',
                          display: 'flex',
                          justifyContent: 'space-between ',
                        }}
                      >
                        <Typography>Sync scroll</Typography>
                        <Box>
                          {isSynced ? (
                            <NextImage
                              src='/green-dot.svg'
                              alt='dot'
                              width='15'
                              height='15'
                            />
                          ) : (
                            ''
                          )}
                        </Box>
                      </MenuItem>
                      {/* <MenuItem onClick={handleClose}>Logout</MenuItem> */}
                    </MenuList>
                  </ClickAwayListener>
                </Paper>
              </Grow>
            )}
          </Popper>
          {/* <Wrapper onClick={() => setOpen(!open)}>File</Wrapper>
         

          <SubWrapper open={open}>
            <div className='enab' onClick={handleOpen}>
              <span className='check'></span>
              <span className='label'>Open...</span>
              <span className='right'></span>
            </div>
            <div
              className={`enab ${image ? '' : 'disable'}`}
              onClick={onClickExport}
            >
              <span className='check'></span>
              <span className='label'>Export</span>
              <span className='right'></span>
            </div>
            <div
              className={`enab ${image ? '' : 'disable'}`}
              onClick={() => {
                setOpen(false)
                setIsSynced(!isSynced)
              }}
            >
              <span className='check'>
                {isSynced ? (
                  <NextImage
                    src='/green-dot.svg'
                    alt='dot'
                    width='15'
                    height='15'
                  />
                ) : (
                  ''
                )}
              </span>
              <span className='label'>Sync scroll</span>
              <span className='right'></span>
            </div>

           
          </SubWrapper> */}
          <Box
            {...getRootProps({ className: 'dropzone' })}
            id='upload'
            className='hidden'
            sx={{ display: 'none' }}
          >
            <input {...getInputProps()} ref={inputRef} />
            <Button>File upload</Button>
          </Box>

          {image ? (
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', flex: 1 }}
            >
              <Box
                sx={{
                  display: 'flex',

                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Tooltip title='Sync scroll'>
                  <IconButton
                    onClick={() => setIsSynced(!isSynced)}
                    sx={{ padding: 0 }}
                    disabled={!image}
                  >
                    <Icon
                      icon='fluent:phone-vertical-scroll-24-filled'
                      fontSize='1.5rem'
                      color={isSynced ? '#66FF66' : 'white'}
                    />
                  </IconButton>
                </Tooltip>
                <Tooltip title='Add Textbox'>
                  <IconButton
                    onClick={() => setAddText(!addText)}
                    sx={{ padding: 0 }}
                    disabled={!image}
                  >
                    <Icon
                      icon='cil:speech'
                      fontSize='1.3rem'
                      color={addText ? '#66FF66' : 'white'}
                    />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  marginRight: '10px',
                }}
              >
                <Typography color='white' fontWeight={500}>
                  {file?.name ?? ''}
                </Typography>
              </Box>
            </Box>
          ) : null}
        </Header>

        <Box
          sx={{ display: 'flex', width: '100%', height: 'calc(100vh - 70px)' }}
        >
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

const Header = styled.div`
  width: 100%;
  height: 32px;
  display: flex;
  justify-content: space-between;
  background-color: #000000;

  * {
    user-select: none;
  }
`

const Wrapper = styled.div`
  display: flex;
  flex: 1;
  margin: 4px;
  padding: 2px 5px 3px 5px;
  padding-left: 6px;
  padding-right: 6px;
  cursor: default;
  color: #ffffff;

  &:hover {
    background-color: rgba(0, 0, 0, 0.25);
    border-radius: 3px;
  }
`

const SubWrapper = styled.div<{ open: boolean }>`
  display: ${p => (p.open ? 'block' : 'none')};
  position: absolute;
  z-index: 10;
  top: 36px;
  width: 200px;
  background-color: ${hexToRGBA('#666666', 0.9)};
  color: #f0f0f0;
  border-radius: 4px;
  margin-left: 2px;
  // margin-left: 1em;
  box-shadow: 0px 0px 20px rgb(0 0 0 / 20%);

  .enab {
    padding: 0.5em 1em 0.5em 0.7em;
    cursor: default;
    display: flex;
    align-items: center;
    gap: 4px;

    &:hover {
      background-color: rgba(190, 230, 255, 1);
    }

    &.disable {
      color: #000;
      cursor: default;

      &:hover {
        cursor: not-allowed;
        background-color: inherit;
      }
    }
  }

  .check {
    // display: inline-block;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 15px;
  }

  .right {
    float: right;
    margin-left: 2em;
    opacity: 0.7;
  }

  .hidden {
    display: none;
  }
`

{
  /* <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            display: 'flex',
            backgroundColor: '#f8f9fa', // Light grey background
            width: '100%',
            boxShadow: '0 2px 4px 0 rgba(0,0,0,0.2)', // Add shadow
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
              color: '#28a745', // Bright green text
              gap: '4px',
              minWidth: '300px',
              justifyContent: 'flex-end',
              marginLeft: '15px',
              paddingTop: '1px',
              width: '300px',
              alignItems: 'center',
              fontFamily: '"Roboto", sans-serif',
            }}
          >
            <Box {...getRootProps({ className: 'dropzone' })} id='upload'>
              <input {...getInputProps()} />
              <Button>File upload</Button>
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
              onClick={() => {
                onClickExport()
              }}
              sx={{
                flex: 1,
                textTransform: 'none',
                display: 'flex',
                height: '44px',
                padding: '10px 18px',
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: '8px',
                border: '1px solid #D0D5DD',
                boxShadow: '0px 1px 2px 0px rgba(16, 24, 40, 0.05)',
                background: '#7F56D9',
                color: 'white',
                '&:hover': {
                  backgroundColor: hexToRGBA('#7F56D9', 0.8),
                },
              }}
            >
              Export
            </Button>
          </Box>
        </Box> */
}
