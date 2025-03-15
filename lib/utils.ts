import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function extractTextFromHTML(html: string): string {
  const tempElement = document.createElement("div");
  tempElement.innerHTML = html;

  function traverse(element: HTMLElement, depth = 0): string {
    let text = "";
    let prevWasLink = false;

    for (const child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        let content = child.textContent?.trim() ?? "";
        if (content) {
          text += (prevWasLink ? "" : " ") + content; // Evita espaço extra entre links e textos
          prevWasLink = false;
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = (child as HTMLElement).tagName;
        const isListItem = tag === "LI";
        const isLink = tag === "A";

        if (isLink) {
          text += traverse(child as HTMLElement, depth); // Links são tratados inline
          prevWasLink = true;
        } else {
          const prefix = "\n" + "  ".repeat(depth); // Adiciona indentação para listas aninhadas
          text +=
            prefix +
            traverse(child as HTMLElement, depth + (isListItem ? 1 : 0));
          prevWasLink = false;
        }
      }
    }

    return text.trim();
  }

  return traverse(tempElement).replace(/\s+/g, " ").trim(); // Garante espaçamento correto
}
