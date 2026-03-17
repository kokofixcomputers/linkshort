import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  children: React.ReactNode
}

export default function ModalPortal({ children }: Props) {
  const portalRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // Create portal container if it doesn't exist
    if (!portalRef.current) {
      portalRef.current = document.createElement('div')
      portalRef.current.id = 'modal-portal'
      document.body.appendChild(portalRef.current)
    }

    return () => {
      // Clean up portal when component unmounts
      if (portalRef.current && portalRef.current.parentNode) {
        portalRef.current.parentNode.removeChild(portalRef.current)
        portalRef.current = null
      }
    }
  }, [])

  return portalRef.current ? createPortal(children, portalRef.current) : null
}
