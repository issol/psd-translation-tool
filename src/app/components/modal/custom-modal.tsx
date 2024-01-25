import { Box, Button, IconButton, Typography } from '@mui/material'
import ClearIcon from '@mui/icons-material/Clear'
import { hexToRGBA } from '@/app/utils/hexToRGBA'
import { useState } from 'react'

type Props = {
  onClose: any
  onClick: (filename: string, fileExtension: string) => void
  title: string | JSX.Element
  subtitle: string | JSX.Element
  leftButtonText?: string
  rightButtonText: string
  filename: string
  fileExtension: string
}
const Modal = ({
  onClick,
  onClose,
  title,
  subtitle,
  leftButtonText,
  rightButtonText,
  filename,
  fileExtension,
}: Props) => {
  const [text, setText] = useState<string>(filename)
  return (
    <Box
      sx={{
        maxWidth: '512px',
        width: '100%',
        background: '#ffffff',
        boxShadow: '0px 0px 20px rgba(76, 78, 100, 0.4)',
        borderRadius: '12px',
        position: 'relative',
        padding: '24px',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          flexDirection: 'column',
          // alignItems: 'center',
          gap: '20px',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Typography
            variant='body2'
            color='#101828'
            fontSize={18}
            fontWeight={600}
            lineHeight='28px'
          >
            {title}
          </Typography>
          <Typography
            color='#475467'
            fontSize={16}
            fontWeight={300}
            lineHeight='20px'
          >
            {subtitle}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <Typography color='#344054' fontSize={12} fontWeight={500}>
            The name of the file to be saved
          </Typography>
          <input
            onChange={e => setText(e.target.value)}
            value={text}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              boxShadow: '0px 1px 2px 0px rgba(16, 24, 40, 0.05)',
            }}
            type='text'
          ></input>
        </Box>

        <Box
          sx={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            alignItems: 'center',

            width: '100%',
          }}
        >
          <Button
            onClick={onClose}
            sx={{
              flex: 1,
              textTransform: 'none',
              display: 'flex',
              height: '44px',
              padding: '10px 18px',
              justifyContent: 'center',
              color: 'black',
              alignItems: 'center',
              borderRadius: '8px',
              border: '1px solid #D0D5DD',
              boxShadow: '0px 1px 2px 0px rgba(16, 24, 40, 0.05)',
              background: '#ffffff',
            }}
          >
            {leftButtonText ?? 'Cancel'}
          </Button>

          <Button
            onClick={() => {
              onClick(text, fileExtension)
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
            {rightButtonText}
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

export default Modal
