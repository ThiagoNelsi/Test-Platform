import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function extractTextFromHTML(html: string): string {
    const tempElement = document.createElement("div");
    tempElement.innerHTML = html;

    function traverse(element: HTMLElement, depth = 0): string {
        let text = "";

        for (const child of element.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) {
                text += child.textContent?.trim() + " ";
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                const tag = (child as HTMLElement).tagName;
                const isListItem = tag === "LI";
                const prefix = "\n" + "  ".repeat(depth); // Adiciona indentação para listas aninhadas
                text += prefix + traverse(child as HTMLElement, depth + (isListItem ? 1 : 0));
            }
        }

        return text.trim();
    }

    return traverse(tempElement).trim();
}