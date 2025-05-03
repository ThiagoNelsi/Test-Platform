import { CircleHelp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
import Link from "next/link";

type HelpTooltipProps = {
  children?: React.ReactNode;
  text?: string;
  delay?: number;
  link?: string;
}

export default function HelpTooltip({ children, text, delay, link }: HelpTooltipProps) {
  return (
    <Tooltip delayDuration={delay ?? 0}>
      <TooltipTrigger>
        <CircleHelp className="h-4 w-4 text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent className="max-w-64 bg-white text-black shadow-sm border border-gray-200">
        <div className="mb-2 text-sm">
          {children ?? (
            <div>{text}</div>
          )}
        </div>
        {link && <Link href={link} className="text-blue-500 underline">Saiba mais</Link>}
      </TooltipContent>
    </Tooltip>
  )
}
