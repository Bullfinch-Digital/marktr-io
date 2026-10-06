import { useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from './button'
import { cn } from './utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(16_26_38_/_0.55)] backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className={cn(
          'bg-background border-2 border-brand-stroke rounded-[28px] p-6 w-full mx-4 max-h-[90vh] overflow-y-auto shadow-[var(--brand-shadow)] animate-scale-in',
          sizes[size]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-fraunces text-2xl font-bold text-text-dark">{title}</h2>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-11 w-11">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

