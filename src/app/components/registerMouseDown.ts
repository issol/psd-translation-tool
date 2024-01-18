export default function registerMouseDown(
  onDragChange: (deltaX: number, deltaY: number) => void,
  setResizing: (resizing: boolean) => void,
  stopPropagation?: boolean,
) {
  return {
    onMouseDown: (clickEvent: React.MouseEvent<Element, MouseEvent>) => {
      if (stopPropagation) clickEvent.stopPropagation()

      const mouseMoveHandler = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.screenX - clickEvent.screenX
        const deltaY = moveEvent.screenY - clickEvent.screenY
        onDragChange(deltaX, deltaY)
      }

      const mouseUpHandler = (e: any) => {
        e.stopPropagation()
        setTimeout(() => {
          setResizing(false)
        }, 1000) // 1.5 seconds timeout
        document.removeEventListener('mousemove', mouseMoveHandler)
        document.removeEventListener('mouseup', mouseUpHandler)
      }

      document.addEventListener('mousemove', mouseMoveHandler, false)
      document.addEventListener('mouseup', mouseUpHandler, {
        once: true,
        capture: false,
      })
    },
  }
}
