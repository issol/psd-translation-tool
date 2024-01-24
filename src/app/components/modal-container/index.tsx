'use client'
import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

import { useRecoilValueLoadable } from 'recoil'
import useModal, { ModalType, modalState } from '@/app/hooks/useModal'
import styled from '@emotion/styled'

function ModalContainer() {
  const modalList = useRecoilValueLoadable(modalState)

  // const [isCSR, setIsCSR] = useState<boolean>(false)

  // useEffect(() => {
  //   setIsCSR(true)

  //   return () => setIsCSR(false)
  // }, [])

  const { closeModal } = useModal()

  const handleClickOverlay = (
    name: string,
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (event.currentTarget !== event.target) return
    event.preventDefault()
    //⬇️ 이 코드가 없으면 이벤트 버블링에 의해 자동으로 closeModal이 실행되면서 중첩 모달을 띄울 수 없게 됨
    event.stopPropagation()
    closeModal(name)
  }

  useEffect(() => {
    if (modalList.getValue().length > 0) {
      document.body.style.cssText = `
    position: fixed;
    top: -${window.scrollY}px;
    overflow-y: scroll;
    width: 100%;`
      return () => {
        const scrollY = document.body.style.top
        document.body.style.cssText = ''
        window.scrollTo(0, parseInt(scrollY || '0', 10) * -1)
      }
    }
  }, [modalList])

  function isClientSideRendering() {
    return typeof window !== 'undefined'
  }

  // ...

  const renderModal = modalList
    .getValue()
    .map(({ type, children, isCloseable = true }: ModalType) => {
      return (
        <Overlay
          key={type}
          onClick={e => {
            isCloseable && handleClickOverlay(type, e)
          }}
        >
          {children}
        </Overlay>
      )
    })
  const element =
    typeof window !== 'undefined' ? document.getElementById('modal') : null

  return isClientSideRendering()
    ? element && renderModal && createPortal(renderModal, element)
    : null

  // if (!isCSR) return <></>
  // return createPortal(<>{renderModal}</>, document.getElementById('modal')!)
}

export default ModalContainer

const Overlay = styled.div`
  width: 100%;
  height: 100%;
  position: fixed;
  top: 0;
  left: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1300;
`
