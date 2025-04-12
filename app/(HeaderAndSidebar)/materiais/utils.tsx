import { File, FileIcon, FileText, ImageIcon } from "lucide-react"

export const getFileIcon = (file: File) => {
  if (file.type.startsWith("image/")) {
    return <ImageIcon className="h-8 w-8 text-blue-500" />
  } else if (file.type === "application/pdf") {
    return <FileIcon className="h-8 w-8 text-red-500" />
  } else if (file.type.includes("word") || file.type.includes("document")) {
    return <FileText className="h-8 w-8 text-indigo-500" />
  } else {
    return <File className="h-8 w-8 text-gray-500" />
  }
}