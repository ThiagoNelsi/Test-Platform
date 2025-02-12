import type { Editor } from '@tiptap/react'
import type { VariantProps } from 'class-variance-authority'
import type { toggleVariants } from '@/app/components/ui/toggle'
import { useState } from 'react'
import { ImageIcon } from '@radix-ui/react-icons'
import { ToolbarButton } from '../toolbar-button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogTrigger
} from '@/app/components/ui/dialog'
import { ImageEditBlock } from './image-edit-block'

interface ImageEditDialogProps extends VariantProps<typeof toggleVariants> {
  editor: Editor
}

const ImageEditDialog = ({ editor, size, variant }: ImageEditDialogProps) => {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <ToolbarButton
          isActive={editor.isActive('image')}
          tooltip="Imagem"
          aria-label="Imagem"
          size={size}
          variant={variant}
        >
          <ImageIcon className="size-5" />
        </ToolbarButton>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Selecione a imagem</DialogTitle>
          <DialogDescription className="sr-only">Adicione uma imagem do seu computador</DialogDescription>
        </DialogHeader>
        <ImageEditBlock editor={editor} close={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

export { ImageEditDialog }
