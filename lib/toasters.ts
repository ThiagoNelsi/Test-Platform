import { toast } from "sonner";
import {
  green,
  red,
} from "tailwindcss/colors";

type Position =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "top-center"
  | "bottom-center";

type ToastOptions = {
  position?: Position;
  duration?: number;
}

export const infoToast = (
  message: string,
  options: ToastOptions = {},
) => {
  toast.info(message, {
    position: options.position || "top-center",
    duration: options.duration || 1500,
    style: {
      color: "#fff",
      border: 0,
    },
  });
};

export const successToast = (message: string) => {
  toast.success(message, {
    position: "top-center",
    style: {
      background: green[500],
      color: "#fff",
      border: 0,
    },
  });
};

export const errorToast = (message: string) => {
  toast.error(message, {
    position: "top-center",
    style: {
      background: red[500],
      color: "#fff",
      border: 0,
    },
  });
};
