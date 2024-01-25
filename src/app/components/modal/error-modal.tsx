import { Box, IconButton, Typography } from '@mui/material'
import ClearIcon from '@mui/icons-material/Clear'
import Image from 'next/image'

type Props = {
  onClose: any
  value: any
}

const ErrorModal = ({ onClose, value }: Props) => {
  return (
    <Box
      sx={{
        maxWidth: '420px',
        width: '100%',
        background: '#ffffff',
        boxShadow: '0px 0px 20px rgba(76, 78, 100, 0.4)',
        borderRadius: '12px',
        position: 'relative',
        padding: '24px',
      }}
    >
      <IconButton
        sx={{ position: 'absolute', top: '10px', right: '10px' }}
        onClick={onClose}
      >
        <ClearIcon />
      </IconButton>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
        }}
      >
        <Image src='/error-icon.svg' alt='error' width='64' height='64' />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Typography
            variant='body2'
            color='#101828'
            fontSize={18}
            fontWeight={600}
            lineHeight='28px'
          >
            Something went wrong, please try again.
          </Typography>
          <Typography
            color='#475467'
            fontSize={16}
            fontWeight={300}
            lineHeight='20px'
          >
            {value}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

export default ErrorModal
