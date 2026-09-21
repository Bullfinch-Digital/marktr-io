import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";

type AlreadyCompletedPromptProps = {
  toolName: string;
  reportPath: string;
  onRunAgain: () => void;
  createdAt: string;
};

function formatRunDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function AlreadyCompletedPrompt({
  toolName,
  reportPath,
  onRunAgain,
  createdAt,
}: AlreadyCompletedPromptProps) {
  const navigate = useNavigate();

  return (
    <div className="rounded-3xl border border-border bg-white p-8 shadow-sm sm:p-12">
      <h1 className="font-['Fraunces'] text-3xl font-bold leading-tight text-[#0D1833] sm:text-4xl">
        You&apos;ve already completed your {toolName}.
      </h1>
      <p className="mt-4 font-['DM_Sans'] text-base text-muted-foreground">
        Last run: {formatRunDate(createdAt)}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={() => navigate(reportPath)}
          className="rounded-full bg-primary px-6 py-6 font-['DM_Sans'] text-base font-medium text-primary-foreground hover:opacity-90"
        >
          View your report
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onRunAgain}
          className="rounded-full border-black px-6 py-6 font-['DM_Sans'] text-base font-medium hover:bg-muted/50"
        >
          Run it again →
        </Button>
      </div>
    </div>
  );
}
