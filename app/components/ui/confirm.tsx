import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/components/ui/alert-dialog";
import React from "react";
import { Input } from "./input";

type ConfirmProps = {
  title: string;
  description: string;
  confirmText: string;
  verificationText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  children: React.ReactNode;
  confirmBtnStyle?: string;
};

export const ConfirmTrigger = ({ children }: { children: React.ReactNode }) => {
  return <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>;
};

export default function Confirm({
  children,
  title,
  description,
  verificationText,
  confirmText = "Confirmar",
  onConfirm,
  onCancel,
  confirmBtnStyle,
}: ConfirmProps) {
  const [inputValue, setInputValue] = React.useState("");

  return (
    <AlertDialog>
      <ConfirmTrigger>{children}</ConfirmTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-neutral-600 font-light">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {verificationText && (
          <div>
            <p className="text-sm text-neutral-600">
              Digite <strong className="underline">{verificationText}</strong>{" "}
              para confirmar
            </p>
            <Input
              placeholder="Digite a palavra de verificação"
              className="mt-2"
              autoFocus
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className={confirmBtnStyle}
            onClick={(e) => {
              if (verificationText && inputValue !== verificationText) {
                e.preventDefault();
                return;
              }
              onConfirm();
            }}
            disabled={Boolean(
              verificationText && inputValue !== verificationText,
            )}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
