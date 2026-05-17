"use client"

import { useState, useRef, type DragEvent, type ChangeEvent } from "react"
import {
  FileText,
  Upload,
  X,
  Plus,
  Tag,
  Save,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { Badge } from "@/app/components/ui/badge"
import { Card, CardContent } from "@/app/components/ui/card"
import { Sidebar } from "@/app/components/sidebar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert"
import { Progress } from "@/app/components/ui/progress"
import axios, { AxiosProgressEvent } from "axios"
import { getFileIcon } from "../utils"
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

export default function UploadMaterialsPage() {
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

  const uploadErrorToast = (...log: any) => {
    console.error('Upload error:', ...log);
    errorToast('Erro ao fazer upload dos arquivos');
  }

  const uploadFile = async (file: FileWithMetadata, fileId: string) => {
    const { data: fetchResponse, error: fetchError } = await tryCatch(fetch(
      '/api/upload',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
    const { data: dbRef, error: dbError } = await tryCatch(fetch('/api/resource', {
      method: 'POST',
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

  return (
    <div className="flex bg-gray-50 dark:bg-gray-900">
      <Sidebar />

      <div id="main-content" className="flex flex-col flex-1 transition-all duration-300 ease-in-out">
        <main className="flex-1 p-6">
          {/* Cabeçalho da página */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Upload de Materiais</h1>
            <p className="text-muted-foreground">Faça upload de materiais para compartilhar com seus alunos</p>
          </div>

          {/* Instrução sobre tags */}
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Dica de organização</AlertTitle>
            <AlertDescription>
              Você pode renomear arquivos e adicionar tags antes de fazer o upload. As tags facilitam a busca e
              organização dos seus materiais posteriormente. Basta clicar no botão &quot;Editar&quot; ao lado do arquivo
            </AlertDescription>
          </Alert>

          {/* Área de upload */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 mb-6 text-center
              transition-colors duration-200 ease-in-out
              ${
                isDragging ? "border-primary bg-primary/5" : "border-gray-300 dark:border-gray-700 hover:border-primary"
              }
            `}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center py-4">
              <Upload className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">Arraste e solte seus arquivos aqui</h3>
              <p className="text-sm text-muted-foreground mb-4">
                ou clique no botão abaixo para selecionar arquivos do seu computador
              </p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                multiple
                className="hidden"
                accept="image/*, .pdf"
              />
              <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
                <Plus className="h-4 w-4" />
                Selecionar Arquivos
              </Button>
            </div>
          </div>

          {/* Lista de arquivos selecionados */}
          {files.length > 0 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Arquivos Selecionados ({files.length})</h2>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setFiles([])} disabled={isUploading}>
                    Limpar Tudo
                  </Button>
                  <Button onClick={uploadFiles} disabled={isUploading || files.length === 0} className="gap-2">
                    <Upload className="h-4 w-4" />
                    {isUploading ? "Enviando..." : "Enviar Arquivos"}
                  </Button>
                </div>
              </div>

              {/* Alerta de upload concluído */}
              {uploadComplete && (
                <Alert className="mb-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <Save className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertTitle>Upload concluído com sucesso!</AlertTitle>
                  <AlertDescription>
                    Todos os {files.length} arquivos foram enviados e estão disponíveis na sua biblioteca de materiais.
                  </AlertDescription>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900"
                    onClick={resetAfterUpload}
                  >
                    Fazer Novo Upload
                  </Button>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {files.map((fileData) => (
                  <Card key={fileData.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
                          {fileData.previewUrl ? (
                            <img
                              src={fileData.previewUrl || "/placeholder.svg"}
                              alt={fileData.file.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            getFileIcon(fileData.file)
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                            <div className="max-w-[calc(100%-24px)] sm:max-w-[60%]">
                              <h4 className="font-medium text-sm truncate" title={fileData.newName}>
                                {fileData.newName}
                                <span className="text-muted-foreground">
                                  {fileData.file.name.substring(fileData.file.name.lastIndexOf("."))}
                                </span>
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {(fileData.file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>

                            <div className="flex gap-2 mt-1 sm:mt-0">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1"
                                onClick={() => openEditDialog(fileData)}
                                disabled={isUploading}
                              >
                                <FileText className="h-3.5 w-3.5" />
                                <span>Editar</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => removeFile(fileData.id)}
                                disabled={isUploading}
                              >
                                <X className="h-4 w-4" />
                                <span className="sr-only">Remover</span>
                              </Button>
                            </div>
                          </div>

                          {fileData.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {fileData.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Barra de progresso de upload */}
                      {isUploading && (
                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Progresso do upload</span>
                            <span>{uploadProgress[fileData.id]}%</span>
                          </div>
                          <Progress indicatorColor="bg-blue-500" value={uploadProgress[fileData.id]} className="h-2" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Mensagem quando não há arquivos */}
          {files.length === 0 && !uploadComplete && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center border">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum arquivo selecionado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Selecione arquivos arrastando-os para a área acima ou clicando no botão de seleção
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Diálogo para editar nome e tags do arquivo */}
      <Dialog open={!!editingFile} onOpenChange={(open) => !open && setEditingFile(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Informações do Arquivo</DialogTitle>
            <DialogDescription>Renomeie o arquivo e adicione tags para facilitar a organização</DialogDescription>
          </DialogHeader>

          {editingFile && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 mb-4">
                {editingFile.previewUrl ? (
                  <img
                    src={editingFile.previewUrl || "/placeholder.svg"}
                    alt={editingFile.file.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  getFileIcon(editingFile.file)
                )}
                <div>
                  <p className="text-sm font-medium">Arquivo original:</p>
                  <p className="text-sm text-muted-foreground">{editingFile.file.name}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fileName">Nome do arquivo</Label>
                <div className="flex gap-1">
                  <Input
                    id="fileName"
                    value={editingFile.newName}
                    onChange={(e) => setEditingFile({ ...editingFile, newName: e.target.value })}
                    className="flex-1"
                  />
                  <div className="flex items-center px-3 rounded-md border bg-muted">
                    <span className="text-sm text-muted-foreground">
                      {editingFile.file.name.substring(editingFile.file.name.lastIndexOf("."))}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fileTags">Tags</Label>
                <div className="flex gap-2">
                  <Input
                    id="fileTags"
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    placeholder="Adicionar tag..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addTagToEditingFile()
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" onClick={addTagToEditingFile} disabled={!currentTag.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {editingFile.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {editingFile.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1 pl-2">
                        <Tag className="h-3 w-3" />
                        {tag}
                        <button
                          className="ml-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 p-0.5"
                          onClick={() => removeTagFromEditingFile(tag)}
                        >
                          <X className="h-3 w-3" />
                          <span className="sr-only">Remover tag</span>
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-2">
                    Nenhuma tag adicionada. Tags ajudam a organizar e encontrar seus materiais.
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFile(null)}>
              Cancelar
            </Button>
            <Button onClick={saveFileChanges}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
