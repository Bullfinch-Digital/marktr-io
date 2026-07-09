export type ICPExportData = {
  id?: string | null;
  appUrl?: string | null;
  name?: string | null;
  description?: string | null;
  brandName?: string | null;
  color?: string | null;
  avatarSrc?: string | null;
  industry?: string | null;
  company_size?: string | null;
  location?: string | null;
  budget?: string | null;
  goals?: string[] | null;
  pain_points?: string[] | null;
  decision_makers?: string[] | null;
  tech_stack?: string[] | null;
  challenges?: string[] | null;
  opportunities?: string[] | null;
  exportedAt?: string | null;
};

type ICPExportLayoutProps = {
  data: ICPExportData;
};

const normalizeList = (items?: string[] | null) =>
  (items || []).map((item) => String(item || "").trim()).filter(Boolean);

const DetailCard = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="export-card export-border border border-black rounded-design p-4 bg-white">
    <p className="export-muted font-['Inter'] text-xs text-foreground/60 mb-1">{label}</p>
    <p className="font-['Inter'] text-sm text-foreground">
      {value && value.trim().length ? value : "—"}
    </p>
  </div>
);

const SectionCard = ({ title, items }: { title: string; items?: string[] | null }) => {
  const list = normalizeList(items);
  return (
    <div data-export-block className="export-card export-border border border-black rounded-design p-4 bg-white">
      <h3 className="font-['Fraunces'] text-lg mb-2">{title}</h3>
      {list.length ? (
        <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
          {list.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-foreground/60 font-['Inter']">—</p>
      )}
    </div>
  );
};

export function ICPExportLayout({ data }: ICPExportLayoutProps) {
  const exportedAt = data.exportedAt || new Date().toISOString().split("T")[0];
  const avatarSrc = data.avatarSrc || "";
  const bandColor = data.color || "#EDEDED";
  const brandLine = data.brandName && data.brandName.trim().length ? data.brandName : "No brand allocated";
  const displayName = data.name && data.name.trim().length ? data.name : "Untitled ICP";
  const description = data.description && data.description.trim().length ? data.description : "—";
  const origin =
    typeof window !== "undefined" && window.location?.origin ? window.location.origin : "";
  const fallbackUrl = data.id ? `${origin}/icp/${data.id}` : "";
  const icpUrl = data.appUrl && data.appUrl.trim().length ? data.appUrl : fallbackUrl;

  return (
    <div className="export-root w-full bg-white text-foreground">
      <div className="p-10 space-y-6">
        <div data-export-block className="space-y-2">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="font-['Fraunces'] text-3xl">ICP Profile</h1>
              <p className="export-muted font-['Inter'] text-sm text-foreground/60">
                Generated on {exportedAt}
              </p>
              {icpUrl ? (
                <p className="font-['Inter'] text-sm mt-2">
                  <a
                    href={icpUrl}
                    className="export-link underline"
                    style={{ color: "#2563eb" }}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View this ICP in the app
                  </a>
                </p>
              ) : null}
            </div>
            <div className="text-right">
              <p className="export-muted font-['Inter'] text-xs text-foreground/60">ICP Generator</p>
            </div>
          </div>
        </div>

        <div data-export-block className="export-card export-border border border-black rounded-design shadow-md overflow-hidden bg-white">
          <div
            className="h-6 export-band"
            style={{ backgroundColor: bandColor, "--export-band-color": bandColor } as React.CSSProperties}
          />
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full border border-black overflow-hidden bg-white flex items-center justify-center">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="ICP avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-accent-grey/30" />
                )}
              </div>
              <div className="space-y-1">
                <p className="export-muted font-['Inter'] text-xs text-foreground/60">Brand</p>
                <p className="font-['Fraunces'] text-lg">{brandLine}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="export-card export-border border border-black rounded-design p-4 bg-white">
                <p className="export-muted font-['Inter'] text-xs text-foreground/60 mb-1">Name</p>
                <p className="font-['Fraunces'] text-2xl">{displayName}</p>
              </div>

              <div className="export-card export-border border border-black rounded-design p-4 bg-white">
                <p className="export-muted font-['Inter'] text-xs text-foreground/60 mb-1">Description</p>
                <p className="font-['Inter'] text-sm text-foreground whitespace-pre-wrap">
                  {description}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <DetailCard label="Industry" value={data.industry} />
                <DetailCard label="Company Size" value={data.company_size} />
                <DetailCard label="Location" value={data.location} />
              </div>

              <DetailCard label="Budget" value={data.budget} />
            </div>
          </div>
        </div>

        <SectionCard title="Goals & Motivations" items={data.goals} />
        <SectionCard title="Pain Points" items={data.pain_points} />
        <SectionCard title="Decision Makers" items={data.decision_makers} />
        <SectionCard title="Digital Tools & Platforms" items={data.tech_stack} />
        <SectionCard title="Challenges" items={data.challenges} />
        <SectionCard title="Opportunities" items={data.opportunities} />
      </div>
    </div>
  );
}
