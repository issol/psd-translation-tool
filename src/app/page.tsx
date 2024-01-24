'use client'

import { RecoilRoot } from 'recoil'

import dynamic from 'next/dynamic'
import ModalContainer from './components/modal-container'
import WorkSpace from './workspace/page'

export default function Home() {
  return (
    <>
      <ModalContainer />
      <WorkSpace />
    </>
  )
}
