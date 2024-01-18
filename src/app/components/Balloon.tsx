import {
  useState,
  MouseEvent,
  useRef,
  useEffect,
  Dispatch,
  SetStateAction,
  RefObject,
} from 'react'
import { XYCoord, useDrag, useDrop } from 'react-dnd'
import { BalloonType } from '../(main)/workspace/page'
import { getEmptyImage } from 'react-dnd-html5-backend'
import { Box, TextareaAutosize } from '@mui/material'
import registerMouseDownDrag from './registerMouseDown'
import registerMouseDown from './registerMouseDown'
import registerMouseDownDown from './registerMouseDown'

interface BalloonProps {
  id: string
  left: number
  top: number
  width: number
  height: number
  text: string
  setBalloons: Dispatch<SetStateAction<BalloonType[]>>
  onDelete: (id: string, event: MouseEvent<HTMLButtonElement>) => void
  handleTextChange: (id: string, text: string) => void
  boundaryRef: RefObject<HTMLDivElement>
  setResizing: Dispatch<SetStateAction<boolean>>
}
const Balloon = ({
  id,
  left,
  top,
  width,
  height,
  setBalloons,
  onDelete,
  text,
  handleTextChange,
  boundaryRef,
  setResizing,
}: BalloonProps) => {
  const BOUNDARY_MARGIN = 12
  const MIN_WIDTH = 150
  const MIN_HEIGHT = 100
  const boxRef = useRef<HTMLDivElement>(null)

  // const [{ isDragging }, drag] = useDrag(
  //   () => ({
  //     type: 'BALLOON',
  //     item: { id, left, top, type: 'BALLOON' },
  //     collect: monitor => ({
  //       isDragging: monitor.isDragging(),
  //     }),
  //   }),
  //   [id, left, top],
  // )

  // const [collected, dragResize, preview] = useDrag(
  //   () => ({
  //     type: 'RESIZE',
  //     item: { id, type: 'RESIZE', left, top, width, height },

  //     collect: monitor => ({
  //       isDragging: monitor.isDragging(),
  //     }),
  //   }),
  //   [id, left, top, width, height],
  // )

  // useEffect(() => {
  //   preview(getEmptyImage(), { captureDraggingState: true })
  // }, [])

  const inrange = (v: number, min: number, max: number) => {
    if (v < min) return min
    if (v > max) return max
    return v
  }

  return (
    <div
      style={{
        transform: `translateX(${left}px) translateY(${top}px)`,
        border: '1px solid red',
        height: height,
        width: width,
        // position: 'absolute',
        position: 'absolute',
      }}
      onMouseDown={e => {
        e.stopPropagation()

        e.nativeEvent.stopImmediatePropagation()
        const initX = e.pageX
        const initY = e.pageY

        const mouseMoveHandler = (e: any) => {
          if (boundaryRef.current && boxRef.current) {
            const boundary = boundaryRef.current.getBoundingClientRect()
            const box = boxRef.current.getBoundingClientRect()

            const deltaX = e.pageX - initX
            const deltaY = e.pageY - initY

            setBalloons(prevBalloons =>
              prevBalloons.map(balloon =>
                balloon.id === id
                  ? {
                      ...balloon,
                      left: inrange(
                        left + deltaX,
                        BOUNDARY_MARGIN,
                        boundary.width - box.width - BOUNDARY_MARGIN,
                      ),
                      top: inrange(
                        top + deltaY,
                        BOUNDARY_MARGIN,
                        boundary.height - box.height - BOUNDARY_MARGIN,
                      ),
                    }
                  : balloon,
              ),
            )
          }
        }
        const mouseUpHandler = (e: any) => {
          e.stopPropagation()

          document.removeEventListener('mousemove', mouseMoveHandler)
          document.removeEventListener('mouseup', mouseUpHandler)
        }

        document.addEventListener('mousemove', mouseMoveHandler, false)
        document.addEventListener('mouseup', mouseUpHandler, {
          once: true,
          capture: false,
        })
      }}
    >
      <Box
        ref={boxRef}
        onClick={e => e.stopPropagation()}
        sx={{
          height: '100%',
          width: '100%',
          cursor: 'move',
          borderColor: 'gray.100',
          backgroundColor: 'white',
          position: 'absolute',
          borderRadius: 'xl',
          borderWidth: '1px',
          transition: 'shadow 0.3s ease-in-out, transform 0.3s ease-in-out',
          '&:active': {
            transform: 'scale(0.95)',
            boxShadow: 'lg',
          },
        }}
      />
      {/* 좌상단 */}
      <div
        style={{
          position: 'absolute',
          top: `-${height / 190}rem`, // Adjust this value as needed
          left: `-${width / 190}rem`, // Adjust this value as needed
          height: `${height / 150}rem`, // Adjust this value as needed
          width: `${width / 150}rem`, // Adjust this value as needed
          cursor: 'nw-resize',
        }}
        onClick={e => e.stopPropagation()}
        onMouseLeave={e => e.stopPropagation()}
        {...registerMouseDown(
          (deltaX, deltaY) => {
            setResizing(true)
            setBalloons(prevBalloons =>
              prevBalloons.map(balloon =>
                balloon.id === id
                  ? {
                      ...balloon,
                      left: inrange(
                        left + deltaX,
                        BOUNDARY_MARGIN,
                        left + width - MIN_WIDTH,
                      ),
                      top: inrange(
                        top + deltaY,
                        BOUNDARY_MARGIN,
                        top + height - MIN_HEIGHT,
                      ),
                      width: inrange(
                        width - deltaX,
                        MIN_WIDTH,
                        left + width - BOUNDARY_MARGIN,
                      ),
                      height: inrange(
                        height - deltaY,
                        MIN_HEIGHT,
                        top + height - BOUNDARY_MARGIN,
                      ),
                    }
                  : balloon,
              ),
            )
          },
          setResizing,
          true,
        )}
      />
      {/* 우상단 */}
      <div
        style={{
          position: 'absolute',
          top: `-${height / 190}rem`, // Adjust this value as needed
          right: `-${width / 190}rem`, // Adjust this value as needed
          height: `${height / 150}rem`, // Adjust this value as needed
          width: `${width / 150}rem`, // Adjust this value as needed
          cursor: 'ne-resize',
        }}
        onClick={e => e.stopPropagation()}
        onMouseLeave={e => e.stopPropagation()}
        {...registerMouseDown(
          (deltaX, deltaY) => {
            if (!boundaryRef.current) return
            setResizing(true)

            const boundary = boundaryRef.current.getBoundingClientRect()
            setBalloons(prevBalloons =>
              prevBalloons.map(balloon =>
                balloon.id === id
                  ? {
                      ...balloon,
                      left,
                      top: inrange(
                        top + deltaY,
                        BOUNDARY_MARGIN,
                        top + height - MIN_HEIGHT,
                      ),
                      width: inrange(
                        width + deltaX,
                        MIN_WIDTH,
                        boundary.width - left - BOUNDARY_MARGIN,
                      ),
                      height: inrange(
                        height - deltaY,
                        MIN_HEIGHT,
                        top + height - BOUNDARY_MARGIN,
                      ),
                    }
                  : balloon,
              ),
            )
          },
          setResizing,
          true,
        )}
      />
      {/* 좌하단 */}
      <div
        style={{
          position: 'absolute',
          bottom: `-${height / 190}rem`, // Adjust this value as needed
          left: `-${width / 190}rem`, // Adjust this value as needed
          height: `${height / 150}rem`, // Adjust this value as needed
          width: `${width / 150}rem`, // Adjust this value as needed
          cursor: 'sw-resize',
        }}
        onClick={e => e.stopPropagation()}
        onMouseLeave={e => e.stopPropagation()}
        {...registerMouseDown(
          (deltaX, deltaY) => {
            if (!boundaryRef.current) return
            setResizing(true)
            const boundary = boundaryRef.current.getBoundingClientRect()
            setBalloons(prevBalloons =>
              prevBalloons.map(balloon =>
                balloon.id === id
                  ? {
                      ...balloon,
                      left: inrange(
                        left + deltaX,
                        BOUNDARY_MARGIN,
                        left + width - MIN_WIDTH,
                      ),
                      top,
                      width: inrange(
                        width - deltaX,
                        MIN_WIDTH,
                        left + width - BOUNDARY_MARGIN,
                      ),
                      height: inrange(
                        height + deltaY,
                        MIN_HEIGHT,
                        boundary.height - top - BOUNDARY_MARGIN,
                      ),
                    }
                  : balloon,
              ),
            )
          },
          setResizing,
          true,
        )}
      />
      {/* 우하단 */}
      <div
        style={{
          position: 'absolute',
          bottom: `-${height / 190}rem`, // Adjust this value as needed
          right: `-${width / 190}rem`, // Adjust this value as needed
          height: `${height / 150}rem`, // Adjust this value as needed
          width: `${width / 150}rem`, // Adjust this value as needed
          cursor: 'se-resize',
        }}
        onClick={e => e.stopPropagation()}
        onMouseLeave={e => e.stopPropagation()}
        {...registerMouseDown(
          (deltaX, deltaY) => {
            if (!boundaryRef.current) return
            setResizing(true)
            const boundary = boundaryRef.current.getBoundingClientRect()
            setBalloons(prevBalloons =>
              prevBalloons.map(balloon =>
                balloon.id === id
                  ? {
                      ...balloon,
                      left,
                      top,
                      width: inrange(
                        width + deltaX,
                        MIN_WIDTH,
                        boundary.width - left - BOUNDARY_MARGIN,
                      ),
                      height: inrange(
                        height + deltaY,
                        MIN_HEIGHT,
                        boundary.height - top - BOUNDARY_MARGIN,
                      ),
                    }
                  : balloon,
              ),
            )
          },
          setResizing,
          true,
        )}
      />
      {/* 상단 */}
      <div
        style={{
          position: 'absolute',
          top: `-${height / 190}rem`, // Adjust this value as needed
          left: `35%`,
          height: `${height / 100}rem`, // Adjust this value as needed
          width: `${width / 50}rem`, // Adjust this value as needed
          cursor: 'n-resize',
        }}
        onClick={e => e.stopPropagation()}
        onMouseLeave={e => e.stopPropagation()}
        {...registerMouseDown(
          (deltaX, deltaY) => {
            setResizing(true)
            setBalloons(prevBalloons =>
              prevBalloons.map(balloon =>
                balloon.id === id
                  ? {
                      ...balloon,
                      left,
                      top: inrange(
                        top + deltaY,
                        BOUNDARY_MARGIN,
                        top + height - MIN_HEIGHT,
                      ),
                      width,
                      height: inrange(
                        height - deltaY,
                        MIN_HEIGHT,
                        top + height - BOUNDARY_MARGIN,
                      ),
                    }
                  : balloon,
              ),
            )
          },
          setResizing,
          true,
        )}
      />
      {/* 하단 */}
      <div
        style={{
          position: 'absolute',
          bottom: `-${height / 190}rem`, // Adjust this value as needed
          left: `35%`,
          height: `${height / 100}rem`, // Adjust this value as needed
          width: `${width / 50}rem`, // Adjust this value as needed
          cursor: 's-resize',
        }}
        onClick={e => e.stopPropagation()}
        onMouseLeave={e => e.stopPropagation()}
        {...registerMouseDown(
          (deltaX, deltaY) => {
            if (!boundaryRef.current) return
            setResizing(true)
            const boundary = boundaryRef.current.getBoundingClientRect()

            setBalloons(prevBalloons =>
              prevBalloons.map(balloon =>
                balloon.id === id
                  ? {
                      ...balloon,
                      left,
                      top,
                      width,
                      height: inrange(
                        height + deltaY,
                        MIN_HEIGHT,
                        boundary.height - top - BOUNDARY_MARGIN,
                      ),
                    }
                  : balloon,
              ),
            )
          },
          setResizing,
          true,
        )}
      />
      {/* 우측 */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          right: `-${width / 190}rem`, // Adjust this value as needed
          height: `${height / 50}rem`, // Adjust this value as needed
          width: `${width / 100}rem`, // Adjust this value as needed
          cursor: 'e-resize',
        }}
        onClick={e => e.stopPropagation()}
        onMouseLeave={e => e.stopPropagation()}
        {...registerMouseDown(
          (deltaX, deltaY) => {
            if (!boundaryRef.current) return
            setResizing(true)
            const boundary = boundaryRef.current.getBoundingClientRect()

            setBalloons(prevBalloons =>
              prevBalloons.map(balloon =>
                balloon.id === id
                  ? {
                      ...balloon,
                      left,
                      top,
                      width: inrange(
                        width + deltaX,
                        MIN_WIDTH,
                        boundary.width - left - BOUNDARY_MARGIN,
                      ),
                      height,
                    }
                  : balloon,
              ),
            )
          },
          setResizing,
          true,
        )}
      />
      {/* 좌측 */}
      <div
        style={{
          position: 'absolute',
          top: `30%`, // Adjust this value as needed
          left: `-${width / 190}rem`, // Adjust this value as needed
          height: `${height / 50}rem`, // Adjust this value as needed
          width: `${width / 100}rem`, // Adjust this value as needed
          cursor: 'w-resize',
        }}
        onClick={e => e.stopPropagation()}
        onMouseLeave={e => e.stopPropagation()}
        {...registerMouseDown(
          (deltaX, deltaY) => {
            setResizing(true)
            setBalloons(prevBalloons =>
              prevBalloons.map(balloon =>
                balloon.id === id
                  ? {
                      ...balloon,
                      left: inrange(
                        left + deltaX,
                        BOUNDARY_MARGIN,
                        left + width - MIN_WIDTH,
                      ),
                      top,
                      width: inrange(
                        width - deltaX,
                        MIN_WIDTH,
                        left + width - BOUNDARY_MARGIN,
                      ),
                      height,
                    }
                  : balloon,
              ),
            )
          },
          setResizing,
          true,
        )}
      />
    </div>
    // </div>
    // <div
    //   // ref={drag}
    //   {...registerMouseDownDrag((deltaX, deltaY) => {
    //     setBalloons(prevBalloons =>
    //       prevBalloons.map(balloon =>
    //         balloon.id === id
    //           ? {
    //               ...balloon,
    //               left: balloon.left + deltaX,
    //               top: balloon.top + deltaY,
    //             }
    //           : balloon,
    //       ),
    //     )
    //   })}
    //   onClick={e => e.stopPropagation()}
    //   style={{
    //     // opacity: isDragging ? 0.5 : 1,
    //     position: 'absolute',
    //     // left,
    //     // top,
    //     width: `${width}px`,
    //     height: `${height}px`,
    //     left: left,
    //     top: top,
    //     padding: '25px 10px 10px 10px',
    //     backgroundColor: '#f8f9fa',
    //     border: '1px solid #ced4da',
    //     borderRadius: '10px',
    //     boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    //     cursor: 'move',
    //     minWidth: '150px',
    //     minHeight: '100px',

    //     // width: `${width}px`,
    //     // height: `${height}px`,
    //     transition: 'width 0.2s, height 0.2s',
    //   }}
    // >
    //   <TextareaAutosize
    //     value={text}
    //     onClick={e => e.stopPropagation()}
    //     onChange={e => {
    //       e.stopPropagation()
    //       handleTextChange(id, e.target.value)
    //     }}
    //     style={{
    //       padding: '5px',
    //       borderRadius: '5px',
    //       border: '1px solid #ced4da',
    //       width: '100%',
    //       height: '100%',
    //       resize: 'none',
    //     }}
    //   />
    //   <button
    //     onClick={(event: MouseEvent<HTMLButtonElement>) => onDelete(id, event)}
    //     style={{
    //       position: 'absolute',
    //       right: '5px',
    //       top: '5px',
    //       backgroundColor: '#f8f9fa',
    //       border: 'none',
    //       borderRadius: '50%',
    //       width: '20px',
    //       height: '20px',
    //       textAlign: 'center',
    //       lineHeight: '20px',
    //       cursor: 'pointer',
    //     }}
    //   >
    //     X
    //   </button>

    //   {/* <div
    //       ref={dragResize}
    //       style={{
    //         position: 'absolute',
    //         right: 0,
    //         bottom: 0,
    //         width: '20px',
    //         height: '20px',
    //         // backgroundColor: 'red',
    //         cursor: 'nwse-resize',
    //       }}
    //     /> */}
    // </div>
  )
}

export default Balloon
