import type { ReactElement } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

export const ARCHIVE_ACTION_TOOLTIP =
  "Moves to Archived — you can restore it anytime.";

type Props = {
  children: ReactElement;
};

export function ArchiveActionTooltip({ children }: Props) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs border-black rounded-design font-['Inter'] text-xs"
        >
          {ARCHIVE_ACTION_TOOLTIP}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
