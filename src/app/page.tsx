'use client'
import Image from 'next/image'
import styles from './page.module.css'
import { Box, Button, FormControlLabel, Switch } from '@mui/material'
import { useDropzone } from 'react-dropzone'
import { useEffect, useMemo, useRef, useState } from 'react'
import Psd from '@webtoon/psd'
import { createMessage, validateMessage } from './messaging'
import WorkSpace from './(main)/workspace/page'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

export default function Home() {
  return (
    <DndProvider backend={HTML5Backend}>
      <WorkSpace />
    </DndProvider>
  )
}
