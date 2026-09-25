import { useEffect, useState, useRef, type DragEvent, type ChangeEvent } from "react"
import { tryCatch } from "@/lib/try-catch"
import { errorToast, infoToast } from "@/lib/toasters"
import {
  usePresignedUploadMutation,
} from "@/src/hooks/use-api-queries"
import { calculateFileSha256, uploadToPresignedPost } from "@/lib/upload-service"

// Tipo para os arquivos selecionados com metadados adicionais
interface FileWithMetadata {
  id: string
  file: File
  newName: string
  tags: string[]
  previewUrl?: string
}

function getFileExtension(filename: string) {
  const lastDot = filename.lastIndexOf(".");
  return lastDot > 0 ? filename.slice(lastDot) : "";
}

function getResourceFilename(file: FileWithMetadata) {
  const extension = getFileExtension(file.file.name);
  const originalName = extension ? file.file.name.slice(0, -extension.length) : file.file.name;
  const requestedName = file.newName.trim() || originalName;

  return extension && !requestedName.toLowerCase().endsWith(extension.toLowerCase())
    ? `${requestedName}${extension}`
    : requestedName;
}

function revokePreview(file: FileWithMetadata) {
  if (file.previewUrl) {
    URL.revokeObjectURL(file.previewUrl);
  }
}

export const useUploadMaterialsController = () => {
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const presignedUploadMutation = usePresignedUploadMutation()

  // Estados
  const [files, setFiles] = useState<FileWithMetadata[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [currentTag, setCurrentTag] = useState("")
  const [editingFile, setEditingFile] = useState<FileWithMetadata | null>(null)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [uploadComplete, setUploadComplete] = useState<boolean>(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [completedFileIds, setCompletedFileIds] = useState<Record<string, boolean>>({})
  const filesRef = useRef(files)

  useEffect(() => {
    filesRef.current = files
  }, [files])

  useEffect(() => {
    return () => {
      filesRef.current.forEach(revokePreview)
    }
  }, [])

  // Manipuladores de eventos para drag and drop
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  // Manipulador para seleção de arquivos via input
  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
    // Permite selecionar o mesmo arquivo novamente depois de uma tentativa.
    e.target.value = ""
  }

  // Função para processar os arquivos selecionados
  const handleFiles = (fileList: FileList) => {
    const newFiles: FileWithMetadata[] = []

    Array.from(fileList).forEach((file) => {
      // Criar um ID único para o arquivo
      const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

      // Criar objeto de metadados do arquivo
      const fileWithMetadata: FileWithMetadata = {
        id: fileId,
        file: file,
        newName: file.name.substring(0, file.name.lastIndexOf(".")) || file.name,
        tags: [],
        previewUrl: undefined,
      }

      // Gerar preview para imagens
      if (file.type.startsWith("image/")) {
        fileWithMetadata.previewUrl = URL.createObjectURL(file)
      }

      newFiles.push(fileWithMetadata)
    })

    setFiles((prev) => [...prev, ...newFiles])
  }

  // Função para remover um arquivo
  const removeFile = (fileId: string) => {
    setFiles((prev) => {
      const updatedFiles = prev.filter((f) => f.id !== fileId)

      // Liberar URLs de preview para evitar vazamentos de memória
      const fileToRemove = prev.find((f) => f.id === fileId)
      if (fileToRemove?.previewUrl) {
        URL.revokeObjectURL(fileToRemove.previewUrl)
      }

      return updatedFiles
    })
    setCompletedFileIds((prev) => {
      const next = { ...prev }
      delete next[fileId]
      return next
    })
  }

  // Função para abrir o diálogo de edição
  const openEditDialog = (file: FileWithMetadata) => {
    setEditingFile({ ...file })
  }

  // Função para salvar as alterações do arquivo
  const saveFileChanges = () => {
    if (!editingFile) return

    setFiles((prev) => prev.map((f) => (f.id === editingFile.id ? { ...editingFile } : f)))

    setEditingFile(null)
  }

  // Função para adicionar uma tag ao arquivo em edição
  const addTagToEditingFile = () => {
    if (!editingFile || !currentTag.trim()) return

    if (!editingFile.tags.includes(currentTag.trim())) {
      setEditingFile({
        ...editingFile,
        tags: [...editingFile.tags, currentTag.trim()],
      })
    }

    setCurrentTag("")
  }

  // Função para remover uma tag do arquivo em edição
  const removeTagFromEditingFile = (tag: string) => {
    if (!editingFile) return

    setEditingFile({
      ...editingFile,
      tags: editingFile.tags.filter((t) => t !== tag),
    })
  }

  const uploadErrorToast = () => {
    errorToast('Erro ao fazer upload dos arquivos');
  }

  const uploadFile = async (file: FileWithMetadata, fileId: string) => {
    const { data: fileHash, error: hashError } = await tryCatch(
      calculateFileSha256(file.file),
    )
    if (hashError || !fileHash) {
      uploadErrorToast()
      return false
    }

    const { data: uploadData, error: fetchError } = await tryCatch(
      presignedUploadMutation.mutateAsync({
        filename: getResourceFilename(file),
        contentType: file.file.type || "application/octet-stream",
        fileSize: file.file.size,
        fileHash,
        tags: file.tags,
      }),
    )

    if (fetchError || !uploadData) {
      uploadErrorToast()
      return false
    }

    if (uploadData.status === "ALREADY_EXISTS") {
      setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }))
      infoToast("Este arquivo já existe nos seus materiais.", { duration: 4000 })
      return true
    }

    if (uploadData.status === "UPLOAD_ALREADY_COMPLETED") {
      setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }))
      infoToast("O arquivo já foi enviado e está sendo preparado.", { duration: 4000 })
      return true
    }

    if (!("uploadUrl" in uploadData)) return false

    const { error: uploadError } = await tryCatch(
      uploadToPresignedPost(uploadData, file.file, (percentage) => {
        setUploadProgress((prev) => ({ ...prev, [fileId]: percentage }))
      }),
    )

    if (uploadError) {
      uploadErrorToast()
      return false
    }

    return true
  }

  const uploadFiles = async () => {
    if (isUploading) return

    const pendingFiles = files.filter((file) => !completedFileIds[file.id])
    if (pendingFiles.length === 0) {
      setUploadComplete(files.length > 0)
      return
    }

    setIsUploading(true)
    setUploadError(null)
    const uploads = pendingFiles.map((file) => {
      setUploadProgress((prev) => ({
        ...prev,
        [file.id]: 0,
      }))
      return uploadFile(file, file.id);
    });

    const { data: results, error } = await tryCatch(Promise.all(uploads));
    const successfulFileIds = pendingFiles
      .filter((_file, index) => results?.[index] === true)
      .map((file) => file.id)
    const nextCompletedFileIds = {
      ...completedFileIds,
      ...Object.fromEntries(successfulFileIds.map((fileId) => [fileId, true])),
    }

    setCompletedFileIds(nextCompletedFileIds)

    const allFilesCompleted = files.every((file) => nextCompletedFileIds[file.id])
    if (error || !allFilesCompleted) {
      uploadErrorToast();
      setUploadError('Um ou mais arquivos não puderam ser enviados. Tente novamente.')
    }
    setUploadComplete(allFilesCompleted)
    setIsUploading(false)
  }

  const clearFiles = () => {
    filesRef.current.forEach(revokePreview)
    setFiles([])
    setCompletedFileIds({})
    setUploadComplete(false)
    setUploadError(null)
    setUploadProgress({})
  }

  // Função para limpar tudo após o upload
  const resetAfterUpload = () => {
    clearFiles()
  }

  return {
    fileInputRef,
    files,
    clearFiles,
    isDragging,
    currentTag,
    setCurrentTag,
    editingFile,
    setEditingFile,
    isUploading,
    uploadComplete,
    uploadError,
    uploadProgress,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileInputChange,
    removeFile,
    openEditDialog,
    saveFileChanges,
    addTagToEditingFile,
    removeTagFromEditingFile,
    uploadFiles,
    resetAfterUpload,
  }
}
