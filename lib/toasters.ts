import { toast } from "sonner"

export const infoToast = (message: string) => {
    toast.info(message, {
        position: "top-center",
        style: {
            background: "#2563eb", // --blue-500
            color: '#fff',
            border: 0
        }
    })
}

export const successToast = (message: string) => {
    toast.success(message, {
        position: "top-center",
        style: {
            background: "#10b981", // --green-500
            color: '#fff',
            border: 0
        }
    })
}

export const errorToast = (message: string) => {
    toast.error(message, {
        position: "top-center",
        style: {
            background: "#ef4444", // --red-500
            color: '#fff',
            border: 0
        }
    })
}