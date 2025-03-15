import * as React from "react";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { Switch } from "@/app/components/ui/switch";
import { Input } from "@/app/components/ui/input";
import { cn } from "@/lib/utils";

export interface LinkEditorProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultUrl?: string;
  defaultText?: string;
  defaultIsNewTab?: boolean;
  onSave: (url: string, text?: string, isNewTab?: boolean) => void;
}

export const LinkEditBlock = React.forwardRef<HTMLDivElement, LinkEditorProps>(
  ({ onSave, defaultIsNewTab, defaultUrl, defaultText, className }, ref) => {
    const formRef = React.useRef<HTMLDivElement>(null);
    const [url, setUrl] = React.useState(defaultUrl || "");
    const [text, setText] = React.useState(defaultText || "");

    const handleSave = React.useCallback(
      (e: React.FormEvent) => {
        e.preventDefault();
        if (formRef.current) {
          const isValid = Array.from(
            formRef.current.querySelectorAll("input"),
          ).every((input) => input.checkValidity());

          if (isValid) {
            onSave(url, text, true);
          } else {
            formRef.current.querySelectorAll("input").forEach((input) => {
              if (!input.checkValidity()) {
                input.reportValidity();
              }
            });
          }
        }
      },
      [onSave, url, text],
    );

    React.useImperativeHandle(ref, () => formRef.current as HTMLDivElement);

    return (
      <div ref={formRef}>
        <div className={cn("space-y-4", className)}>
          <div className="space-y-1">
            <Label>URL</Label>
            <Input
              type="url"
              required
              placeholder="Digite a URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Texto de exibição (optional)</Label>
            <Input
              type="text"
              placeholder="Digite o texto de exibição"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              className="bg-verdigris hover:bg-verdigris-400"
              type="button"
              onClick={handleSave}
            >
              Salvar
            </Button>
          </div>
        </div>
      </div>
    );
  },
);

LinkEditBlock.displayName = "LinkEditBlock";

export default LinkEditBlock;
