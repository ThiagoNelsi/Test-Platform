import * as React from "react";
import type { Editor } from "@tiptap/react";
import type { FormatAction } from "../../types";
import type { toggleVariants } from "@/app/components/ui/toggle";
import type { VariantProps } from "class-variance-authority";
import {
  CodeIcon,
  DotsHorizontalIcon,
  FontBoldIcon,
  FontItalicIcon,
  StrikethroughIcon,
  TextNoneIcon,
  UnderlineIcon,
} from "@radix-ui/react-icons";
import { ToolbarSection } from "../toolbar-section";

type TextStyleAction =
  | "bold"
  | "italic"
  | "underline"
  | "strikethrough"
  | "code"
  | "clearFormatting";

interface TextStyle extends FormatAction {
  value: TextStyleAction;
}

const formatActions: TextStyle[] = [
  {
    value: "bold",
    label: "Negrito",
    icon: <FontBoldIcon className="size-5" />,
    action: (editor) => editor.chain().focus().toggleBold().run(),
    isActive: (editor) => editor.isActive("bold"),
    canExecute: (editor) =>
      editor.can().chain().focus().toggleBold().run() &&
      !editor.isActive("codeBlock"),
    shortcuts: ["mod", "B"],
  },
  {
    value: "italic",
    label: "Itálico",
    icon: <FontItalicIcon className="size-5" />,
    action: (editor) => editor.chain().focus().toggleItalic().run(),
    isActive: (editor) => editor.isActive("italic"),
    canExecute: (editor) =>
      editor.can().chain().focus().toggleItalic().run() &&
      !editor.isActive("codeBlock"),
    shortcuts: ["mod", "I"],
  },
  {
    value: "underline",
    label: "Sublinhado",
    icon: <UnderlineIcon className="size-5" />,
    action: (editor) => editor.chain().focus().toggleUnderline().run(),
    isActive: (editor) => editor.isActive("underline"),
    canExecute: (editor) =>
      editor.can().chain().focus().toggleUnderline().run() &&
      !editor.isActive("codeBlock"),
    shortcuts: ["mod", "U"],
  },
  {
    value: "strikethrough",
    label: "Tachar",
    icon: <StrikethroughIcon className="size-5" />,
    action: (editor) => editor.chain().focus().toggleStrike().run(),
    isActive: (editor) => editor.isActive("strike"),
    canExecute: (editor) =>
      editor.can().chain().focus().toggleStrike().run() &&
      !editor.isActive("codeBlock"),
    shortcuts: ["mod", "shift", "S"],
  },
  {
    value: "code",
    label: "Código",
    icon: <CodeIcon className="size-5" />,
    action: (editor) => editor.chain().focus().toggleCode().run(),
    isActive: (editor) => editor.isActive("code"),
    canExecute: (editor) =>
      editor.can().chain().focus().toggleCode().run() &&
      !editor.isActive("codeBlock"),
    shortcuts: ["mod", "E"],
  },
  {
    value: "clearFormatting",
    label: "Limpar formatação",
    icon: <TextNoneIcon className="size-5" />,
    action: (editor) => editor.chain().focus().unsetAllMarks().run(),
    isActive: () => false,
    canExecute: (editor) =>
      editor.can().chain().focus().unsetAllMarks().run() &&
      !editor.isActive("codeBlock"),
    shortcuts: ["mod", "\\"],
  },
];

interface SectionTwoProps extends VariantProps<typeof toggleVariants> {
  editor: Editor;
  activeActions?: TextStyleAction[];
  mainActionCount?: number;
}

export const SectionTwo: React.FC<SectionTwoProps> = ({
  editor,
  activeActions = formatActions.map((action) => action.value),
  mainActionCount = 2,
  size,
  variant,
}) => {
  return (
    <ToolbarSection
      editor={editor}
      actions={formatActions}
      activeActions={activeActions}
      mainActionCount={mainActionCount}
      dropdownIcon={<DotsHorizontalIcon className="size-5" />}
      dropdownTooltip="Mais opções"
      dropdownClassName="w-8"
      size={size}
      variant={variant}
    />
  );
};

SectionTwo.displayName = "SectionTwo";

export default SectionTwo;
