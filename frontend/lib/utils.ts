import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Cookies from 'js-cookie';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function extractTextFromHTML(html: string): string {
  const tempElement = document.createElement("div");
  tempElement.innerHTML = html;

  return tempElement.innerText;
}

export const getCookie = (name: string) => {
  return Cookies.get(name);
};
