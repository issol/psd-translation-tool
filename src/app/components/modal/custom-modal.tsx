import { Box, Button, IconButton, Typography } from '@mui/material'
import ClearIcon from '@mui/icons-material/Clear'

type Props = {
  onClose: any
  onClick: any
  title: string | JSX.Element
  leftButtonText?: string
  rightButtonText: string
}
const Modal = ({
  onClick,
  onClose,
  title,
  leftButtonText,
  rightButtonText,
}: Props) => {
  return (
    <Box
      sx={{
        maxWidth: '381px',
        width: '100%',
        background: '#ffffff',
        boxShadow: '0px 0px 20px rgba(76, 78, 100, 0.4)',
        borderRadius: '10px',
        position: 'relative',
        // position: closeButton ? 'relative' : 'inherit',
      }}
    >
      {/* <IconButton
        sx={{ position: 'absolute', top: '10px', right: '10px' }}
        onClick={onClose}
      >
        <ClearIcon />
      </IconButton> */}

      <Box
        sx={{
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Typography
            variant='body2'
            textAlign='center'
            mt='10px'
            color='secondary'
            sx={{ marginBottom: '16px' }}
          >
            {title}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
              alignItems: 'center',

              width: '100%',
            }}
          >
            <Button variant='outlined' onClick={onClose}>
              {leftButtonText ?? 'Cancel'}
            </Button>

            <Button variant='contained' onClick={onClick}>
              {rightButtonText}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export default Modal
