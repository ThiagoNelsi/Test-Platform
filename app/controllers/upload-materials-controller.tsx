"use client"

import { useState, useRef, type DragEvent, type ChangeEvent } from "react"
import axios, { AxiosProgressEvent } from "axios"
import { tryCatch } from "@/lib/try-catch"
import { errorToast } from "@/lib/toasters"

// Tipo para os arquivos selecionados com metadados adicionais
interface FileWithMetadata {
  id: string
  file: File
  newName: string
  tags: string[]
  previewUrl?: string
}

export const useUploadMaterialsController = () => {
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL ?? ""
  const backendBase = backend.replace(/\/+$/g, "")
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estados
  const [files, setFiles] = useState<FileWithMetadata[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [currentTag, setCurrentTag] = useState("")
  const [editingFile, setEditingFile] = useState<FileWithMetadata | null>(null)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [uploadComplete, setUploadComplete] = useState<boolean>(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})

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

  const uploadErrorToast = (...log: unknown[]) => {
    console.error('Upload error:', ...log);
    errorToast('Erro ao fazer upload dos arquivos');
  }

  const uploadFile = async (file: FileWithMetadata, fileId: string) => {
    if (!backendBase) {
      uploadErrorToast("Backend URL is not configured")
      return false
    }

    const { data: fetchResponse, error: fetchError } = await tryCatch(fetch(
      `${backendBase}/api/upload`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ filename: file.file.name, contentType: file.file.type }),
      }
    ))

    if (fetchError || fetchResponse === null || !fetchResponse.ok) {
      uploadErrorToast(fetchResponse, fetchError);
      return false
    }

    const { data: { url, fields }, error: parseError } = await tryCatch(fetchResponse.json())

    if (parseError) {
      uploadErrorToast('Error parsing upload response', parseError);
      return false
    }

    const formData = new FormData()
    Object.entries(fields).forEach(([key, value]) => {
      formData.append(key, value as string)
    })
    formData.append('file', file.file)

    const { data: uploadResponse, error: uploadError } = await tryCatch(axios.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (!progressEvent.total) return
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        setUploadProgress(prev => ({
          ...prev,
          [fileId]: percentCompleted
        }))
      }
    }));

    if (uploadError || uploadResponse.status !== 204) {
      uploadErrorToast(uploadResponse, uploadError);
      return false
    }

    // save the file URL to database
    const { data: dbRef, error: dbError } = await tryCatch(fetch(`${backendBase}/api/resource`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        filename: file.file.name,
        fileType: file.file.type,
        objectKey: fields.key,
        tags: file.tags,
      })
    }));

    if (dbError || !dbRef.ok) {
      uploadErrorToast(dbRef, dbError);
      return false
    }

    return dbRef.ok
  }

  const uploadFiles = async () => {
    setIsUploading(true)
    const uploads = files.map((file) => {
      setUploadProgress(prev => ({
        ...prev,
        [file.id]: 0
      }))
      return uploadFile(file, file.id);
    });

    const { error } = await tryCatch(Promise.all(uploads));
    if (error) {
      uploadErrorToast(error);
    }
    setUploadComplete(true)
    setIsUploading(false)
  }

  // Função para limpar tudo após o upload
  const resetAfterUpload = () => {
    setFiles([])
    setUploadComplete(false)
    setUploadProgress({})
  }

  return {
    fileInputRef,
    files,
    setFiles,
    isDragging,
    currentTag,
    setCurrentTag,
    editingFile,
    setEditingFile,
    isUploading,
    uploadComplete,
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
