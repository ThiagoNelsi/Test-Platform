import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/app/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { on } from "events";
import React from "react";

type ConfirmProps = {
    title: string;
    description: string;
    confirmText: string;
    onConfirm: () => void;
    onCancel?: () => void;
    children: React.ReactNode;
    confirmBtnStyle?: string;
}

export const ConfirmTrigger = ({ children }: { children: React.ReactNode }) => {
    return (
        <AlertDialogTrigger asChild>
            {children}
        </AlertDialogTrigger>
    )
}

export default function Confirm({ children, title, description, confirmText = 'Confirmar', onConfirm, onCancel, confirmBtnStyle }: ConfirmProps) {
    return (
        <AlertDialog>
            <ConfirmTrigger>
                {children}
            </ConfirmTrigger>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{title}</AlertDialogTitle>
                <AlertDialogDescription>{description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={onCancel}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                    className={confirmBtnStyle}
                    onClick={onConfirm}
                >
                    {confirmText}
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}