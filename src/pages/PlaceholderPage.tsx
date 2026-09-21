import DashboardShell from "../layouts/DashboardShell";

interface PlaceholderPageProps {
  title: string;
}

export default function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <DashboardShell>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-px bg-[#D4871A] mb-8 mx-auto" />
        <h1 className="font-['Fraunces'] text-4xl font-bold text-foreground mb-3">
          {title}
        </h1>
        <p className="text-muted-foreground font-['DM_Sans'] text-lg">Coming soon</p>
      </div>
    </DashboardShell>
  );
}
