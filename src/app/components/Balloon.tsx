import { useState, MouseEvent, useRef } from 'react'
import { XYCoord, useDrag, useDrop } from 'react-dnd'
import { BalloonType } from '../(main)/workspace/page'

interface BalloonProps {
  id: string
  left: number
  top: number
  text: string
  onMove: (id: string, left: number, top: number) => void
  onDelete: (id: string, event: MouseEvent<HTMLButtonElement>) => void
  handleTextChange: (id: string, text: string) => void
}
const Balloon = ({
  id,
  left,
  top,
  onMove,
  onDelete,
  text,
  handleTextChange,
}: BalloonProps) => {
  // const [text, setText] = useState('')

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: 'BALLOON',
      item: { id, left, top },
      collect: monitor => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [id, left, top],
  )

  return (
    <div
      ref={drag}
      onClick={e => e.stopPropagation()}
      style={{
        opacity: isDragging ? 0.5 : 1,
        position: 'absolute',
        left,
        top,
        padding: '10px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #ced4da',
        borderRadius: '10px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        cursor: 'move',
      }}
    >
      <input
        type='text'
        value={text}
        onClick={e => e.stopPropagation()}
        onChange={e => {
          e.stopPropagation()
          // setText(e.target.value)
          handleTextChange(id, e.target.value)
        }}
        style={{
          padding: '5px',
          borderRadius: '5px',
          border: '1px solid #ced4da',
        }}
      />
      <button
        onClick={(event: MouseEvent<HTMLButtonElement>) => onDelete(id, event)}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
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
    </div>
  )
}

export default Balloon
