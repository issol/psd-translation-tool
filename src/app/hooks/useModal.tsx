import { atom, useRecoilState, useRecoilStateLoadable } from 'recoil'
import { ReactNode } from 'react'

export type ModalType = {
  type: string
  children: ReactNode
  isCloseable?: boolean
}

export const modalState = atom<Array<ModalType>>({
  key: `modalState-${Math.random()}`,
  default: [],
})

export function useModal() {
  const [modal, setModal] = useRecoilStateLoadable(modalState)

  const openModal = (newValue: ModalType) => {
    setModal(oldModalState => {
      const isCloseable = newValue.isCloseable ?? false

      return oldModalState.concat({
        ...newValue,
        isCloseable: isCloseable,
      })
    })
  }

  const closeModal = (type: string) => {
    setModal(oldModalState => {
      const newModalState = [...oldModalState]
      newModalState.pop()
      return newModalState
    })
  }

  return { modal, openModal, closeModal }
}

export default useModal
