import { toast } from "sonner";
import {
  green,
  blue,
  red,
} from "tailwindcss/colors";

type Position =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "top-center"
  | "bottom-center";

export const infoToast = (
  message: string,
  position: Position = "top-center",
) => {
  toast.info(message, {
    position,
    style: {
      background: blue[500],
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
