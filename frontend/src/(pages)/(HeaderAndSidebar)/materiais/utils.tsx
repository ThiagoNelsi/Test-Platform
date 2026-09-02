import { File, FileIcon, FileText, ImageIcon } from "lucide-react"

export const FileIconComponent = ({ fileType }: { fileType: string }) => {
  if (fileType.startsWith("image/")) {
    return <ImageIcon className="h-8 w-8 text-blue-500" />
  } else if (fileType === "application/pdf") {
    return <FileIcon className="h-8 w-8 text-red-500" />
  } else if (fileType.includes("word") || fileType.includes("document")) {
    return <FileText className="h-8 w-8 text-indigo-500" />
  } else {
    return <File className="h-8 w-8 text-gray-500" />
  }
}
