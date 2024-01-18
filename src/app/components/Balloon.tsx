import { useState, MouseEvent, useRef, useEffect } from 'react'
import { XYCoord, useDrag, useDrop } from 'react-dnd'
import { BalloonType } from '../(main)/workspace/page'
import { getEmptyImage } from 'react-dnd-html5-backend'
import { TextareaAutosize } from '@mui/material'
import registerMouseDownDrag from './registerMouseDown'

interface BalloonProps {
  id: string
  left: number
  top: number
  width: number
  height: number
  text: string
  delta: XYCoord | null

  onDelete: (id: string, event: MouseEvent<HTMLButtonElement>) => void
  handleTextChange: (id: string, text: string) => void
}
const Balloon = ({
  id,
  left,
  top,
  width,
  height,
  delta,
  onDelete,
  text,
  handleTextChange,
}: BalloonProps) => {
  const [{ x, y, w, h }, setConfig] = useState({
    x: left,
    y: top,
    w: width,
    h: height,
  })

  const [originalSize, setOriginalSize] = useState<{
    width: number
    height: number
  } | null>(null)

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: 'BALLOON',
      item: { id, left, top, type: 'BALLOON' },
      collect: monitor => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [id, left, top],
  )

  const [collected, dragResize, preview] = useDrag(
    () => ({
      type: 'RESIZE',
      item: { id, type: 'RESIZE', left, top, width, height },

      collect: monitor => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [id, left, top, width, height],
  )

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true })
  }, [])

  return (
    <div
      ref={drag}
      onClick={e => e.stopPropagation()}
      style={{
        opacity: isDragging ? 0.5 : 1,
        position: 'absolute',
        // left,
        // top,
        width: `${w}px`,
        height: `${h}px`,
        left: y,
        top: x,
        padding: '25px 10px 10px 10px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #ced4da',
        borderRadius: '10px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        cursor: 'move',
        minWidth: '150px',
        minHeight: '100px',

        // width: `${width}px`,
        // height: `${height}px`,
        transition: 'width 0.2s, height 0.2s',
      }}
    >
      <TextareaAutosize
        value={text}
        onClick={e => e.stopPropagation()}
        onChange={e => {
          e.stopPropagation()
          handleTextChange(id, e.target.value)
        }}
        style={{
          padding: '5px',
          borderRadius: '5px',
          border: '1px solid #ced4da',
          width: '100%',
          height: '100%',
          resize: 'none',
        }}
      />
      <button
        onClick={(event: MouseEvent<HTMLButtonElement>) => onDelete(id, event)}
        style={{
          position: 'absolute',
          right: '5px',
          top: '5px',
          backgroundColor: '#f8f9fa',
          border: 'none',
          borderRadius: '50%',
          width: '20px',
          height: '20px',
          textAlign: 'center',
          lineHeight: '20px',
          cursor: 'pointer',
        }}
      >
        X
      </button>
      <div
        // 3️⃣
        // className='absolute -bottom-0.5 left-3 right-3 h-2 cursor-s-resize'
        style={{
          position: 'absolute',
          bottom: '-0.5rem',
          left: '3px',
          right: '3px',
          height: '2px',
          cursor: 's-resize',
        }}
        {...registerMouseDownDrag((deltaX, deltaY) => {
          // 4️⃣
          setConfig({
            x,
            y,
            w: w + deltaX,
            h: h + deltaY,
          })
        })}
      />
      {/* <div
          ref={dragResize}
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: '20px',
            height: '20px',
            // backgroundColor: 'red',
            cursor: 'nwse-resize',
          }}
        /> */}
    </div>
  )
}

export default Balloon
