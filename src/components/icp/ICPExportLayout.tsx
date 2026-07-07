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
  strategyGoal?: string | null;
  strategyChannel?: string | null;
  strategyOfferType?: string | null;
  strategyTone?: string | null;
  strategy?: {
    positioning?: { one_liner?: string; why_us?: string; differentiators?: string[] };
    messaging?: {
      value_props?: string[];
      pain_to_promise?: string[];
      objections_and_rebuttals?: string[];
    };
    campaign_ideas?: { name: string; hook: string; angle: string; cta: string }[];
    channel_plan?: {
      primary_channel?: string;
      secondary_channels?: string[];
      first_14_days?: string[];
    };
    offer?: {
      recommended_offer?: string;
      lead_magnet_idea?: string | null;
      landing_page_sections?: string[];
    };
    ad_assets?: {
      headlines?: string[];
      primary_texts?: string[];
      creative_briefs?: string[];
    } | null;
    success_metrics?: { kpis?: string[]; targets?: string[] };
  } | null;
  strategies?: Array<{
    goal?: string | null;
    channel?: string | null;
    offer_type?: string | null;
    tone?: string | null;
    created_at?: string | null;
    strategy?: ICPExportData["strategy"];
  }> | null;
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
  const strategy = data.strategy || null;
  const strategies = (data.strategies || []).filter(Boolean);
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

        {strategies.length ? (
          <>
            {strategies.map((entry, entryIndex) => {
              const s = entry.strategy || null;
              const number = entryIndex + 1;
              return (
                <div key={`strategy-export-${entryIndex}`} className="space-y-4">
                  <div data-export-block className="export-card export-border border border-black rounded-design p-4 bg-white">
                    <h3 className="font-['Fraunces'] text-lg mb-2">Marketing Strategy {number}</h3>
                    <p className="export-muted font-['Inter'] text-xs text-foreground/60">
                      {[
                        entry.goal ? `Goal: ${entry.goal}` : null,
                        entry.channel ? `Channel: ${entry.channel}` : null,
                        entry.offer_type ? `Offer: ${entry.offer_type}` : null,
                        entry.tone ? `Tone: ${entry.tone}` : null,
                        entry.created_at
                          ? `Created: ${new Date(entry.created_at).toLocaleDateString("en-GB")}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>

                  <div data-export-block className="export-card export-border border border-black rounded-design p-4 bg-white">
                    <h4 className="font-['Fraunces'] text-lg mb-2">Positioning</h4>
                    <p className="text-sm font-['Inter'] text-foreground/80">
                      <span className="font-semibold">One-liner:</span> {s?.positioning?.one_liner || "—"}
                    </p>
                    <p className="text-sm font-['Inter'] text-foreground/80 mt-2">
                      <span className="font-semibold">Why us:</span> {s?.positioning?.why_us || "—"}
                    </p>
                    <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] mt-2 space-y-1">
                      {(s?.positioning?.differentiators || []).map((item, index) => (
                        <li key={`exp-diff-${entryIndex}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div data-export-block className="export-card export-border border border-black rounded-design p-4 bg-white">
                    <h4 className="font-['Fraunces'] text-lg mb-2">Messaging</h4>
                    <p className="export-muted font-['Inter'] text-xs text-foreground/60 mb-1">Value props</p>
                    <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                      {(s?.messaging?.value_props || []).map((item, index) => (
                        <li key={`exp-vp-${entryIndex}-${index}`}>{item}</li>
                      ))}
                    </ul>
                    <p className="export-muted font-['Inter'] text-xs text-foreground/60 mb-1 mt-3">Pain to promise</p>
                    <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                      {(s?.messaging?.pain_to_promise || []).map((item, index) => (
                        <li key={`exp-ptp-${entryIndex}-${index}`}>{item}</li>
                      ))}
                    </ul>
                    <p className="export-muted font-['Inter'] text-xs text-foreground/60 mb-1 mt-3">
                      Objections & rebuttals
                    </p>
                    <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                      {(s?.messaging?.objections_and_rebuttals || []).map((item, index) => (
                        <li key={`exp-obr-${entryIndex}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div data-export-block className="export-card export-border border border-black rounded-design p-4 bg-white">
                    <h4 className="font-['Fraunces'] text-lg mb-2">Campaign ideas</h4>
                    <div className="space-y-3">
                      {(s?.campaign_ideas || []).map((idea, index) => (
                        <div key={`exp-campaign-${entryIndex}-${index}`} className="border border-black/10 rounded-design p-3 bg-white">
                          <p className="text-sm font-['Inter'] text-foreground/80">
                            <span className="font-semibold">{idea.name}:</span> {idea.hook}
                          </p>
                          <p className="text-sm font-['Inter'] text-foreground/70 mt-1">{idea.angle}</p>
                          <p className="text-sm font-['Inter'] text-foreground/70 mt-1">CTA: {idea.cta}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div data-export-block className="export-card export-border border border-black rounded-design p-4 bg-white">
                    <h4 className="font-['Fraunces'] text-lg mb-2">Channel plan</h4>
                    <p className="text-sm font-['Inter'] text-foreground/80">
                      <span className="font-semibold">Primary:</span>{" "}
                      {s?.channel_plan?.primary_channel || "—"}
                    </p>
                    <p className="export-muted font-['Inter'] text-xs text-foreground/60 mb-1 mt-2">Secondary</p>
                    <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                      {(s?.channel_plan?.secondary_channels || []).map((item, index) => (
                        <li key={`exp-secondary-${entryIndex}-${index}`}>{item}</li>
                      ))}
                    </ul>
                    <p className="export-muted font-['Inter'] text-xs text-foreground/60 mb-1 mt-3">First 14 days</p>
                    <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                      {(s?.channel_plan?.first_14_days || []).map((item, index) => (
                        <li key={`exp-first14-${entryIndex}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div data-export-block className="export-card export-border border border-black rounded-design p-4 bg-white">
                    <h4 className="font-['Fraunces'] text-lg mb-2">Offer</h4>
                    <p className="text-sm font-['Inter'] text-foreground/80">
                      <span className="font-semibold">Recommended:</span>{" "}
                      {s?.offer?.recommended_offer || "—"}
                    </p>
                    <p className="text-sm font-['Inter'] text-foreground/80 mt-2">
                      <span className="font-semibold">Lead magnet:</span>{" "}
                      {s?.offer?.lead_magnet_idea || "—"}
                    </p>
                    <p className="export-muted font-['Inter'] text-xs text-foreground/60 mb-1 mt-3">
                      Landing page sections
                    </p>
                    <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                      {(s?.offer?.landing_page_sections || []).map((item, index) => (
                        <li key={`exp-landing-${entryIndex}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div data-export-block className="export-card export-border border border-black rounded-design p-4 bg-white">
                    <h4 className="font-['Fraunces'] text-lg mb-2">Ad assets</h4>
                    {s?.ad_assets ? (
                      <>
                        <p className="export-muted font-['Inter'] text-xs text-foreground/60 mb-1">Headlines</p>
                        <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                          {(s?.ad_assets?.headlines || []).map((item, index) => (
                            <li key={`exp-headline-${entryIndex}-${index}`}>{item}</li>
                          ))}
                        </ul>
                        <p className="export-muted font-['Inter'] text-xs text-foreground/60 mb-1 mt-3">Primary text</p>
                        <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                          {(s?.ad_assets?.primary_texts || []).map((item, index) => (
                            <li key={`exp-primary-${entryIndex}-${index}`}>{item}</li>
                          ))}
                        </ul>
                        <p className="export-muted font-['Inter'] text-xs text-foreground/60 mb-1 mt-3">Creative briefs</p>
                        <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                          {(s?.ad_assets?.creative_briefs || []).map((item, index) => (
                            <li key={`exp-brief-${entryIndex}-${index}`}>{item}</li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p className="text-sm font-['Inter'] text-foreground/60">Not included</p>
                    )}
                  </div>

                  <div data-export-block className="export-card export-border border border-black rounded-design p-4 bg-white">
                    <h4 className="font-['Fraunces'] text-lg mb-2">Success metrics</h4>
                    <p className="export-muted font-['Inter'] text-xs text-foreground/60 mb-1">KPIs</p>
                    <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                      {(s?.success_metrics?.kpis || []).map((item, index) => (
                        <li key={`exp-kpi-${entryIndex}-${index}`}>{item}</li>
                      ))}
                    </ul>
                    <p className="export-muted font-['Inter'] text-xs text-foreground/60 mb-1 mt-3">Targets</p>
                    <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                      {(s?.success_metrics?.targets || []).map((item, index) => (
                        <li key={`exp-target-${entryIndex}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </>
        ) : strategy ? (
          <>
            <div data-export-block className="export-card export-border border border-black rounded-design p-4 bg-white">
              <h3 className="font-['Fraunces'] text-lg mb-2">Marketing Strategy</h3>
              <p className="export-muted font-['Inter'] text-xs text-foreground/60">
                {[
                  data.strategyGoal ? `Goal: ${data.strategyGoal}` : null,
                  data.strategyChannel ? `Channel: ${data.strategyChannel}` : null,
                  data.strategyOfferType ? `Offer: ${data.strategyOfferType}` : null,
                  data.strategyTone ? `Tone: ${data.strategyTone}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>

            <div data-export-block className="export-card export-border border border-black rounded-design p-4 bg-white">
              <h4 className="font-['Fraunces'] text-lg mb-2">Positioning</h4>
              <p className="text-sm font-['Inter'] text-foreground/80">
                <span className="font-semibold">One-liner:</span> {strategy.positioning?.one_liner || "—"}
              </p>
              <p className="text-sm font-['Inter'] text-foreground/80 mt-2">
                <span className="font-semibold">Why us:</span> {strategy.positioning?.why_us || "—"}
              </p>
              <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] mt-2 space-y-1">
                {(strategy.positioning?.differentiators || []).map((item, index) => (
                  <li key={`exp-diff-${index}`}>{item}</li>
                ))}
              </ul>
            </div>

            <div data-export-block className="export-card export-border border border-black rounded-design p-4 bg-white">
              <h4 className="font-['Fraunces'] text-lg mb-2">Messaging</h4>
              <p className="export-muted font-['Inter'] text-xs text-foreground/60 mb-1">Value props</p>
              <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                {(strategy.messaging?.value_props || []).map((item, index) => (
                  <li key={`exp-vp-${index}`}>{item}</li>
                ))}
              </ul>
              <p className="export-muted font-['Inter'] text-xs text-foreground/60 mb-1 mt-3">Pain to promise</p>
              <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                {(strategy.messaging?.pain_to_promise || []).map((item, index) => (
                  <li key={`exp-ptp-${index}`}>{item}</li>
                ))}
              </ul>
              <p className="export-muted font-['Inter'] text-xs text-foreground/60 mb-1 mt-3">
                Objections & rebuttals
              </p>
              <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                {(strategy.messaging?.objections_and_rebuttals || []).map((item, index) => (
                  <li key={`exp-obr-${index}`}>{item}</li>
                ))}
              </ul>
            </div>

            <div data-export-block className="export-card export-border border border-black rounded-design p-4 bg-white">
              <h4 className="font-['Fraunces'] text-lg mb-2">Campaign ideas</h4>
              <div className="space-y-3">
                {(strategy.campaign_ideas || []).map((idea, index) => (
                  <div key={`exp-campaign-${index}`} className="border border-black/10 rounded-design p-3 bg-white">
                    <p className="text-sm font-['Inter'] text-foreground/80">
                      <span className="font-semibold">{idea.name}:</span> {idea.hook}
                    </p>
                    <p className="text-sm font-['Inter'] text-foreground/70 mt-1">{idea.angle}</p>
                    <p className="text-sm font-['Inter'] text-foreground/70 mt-1">CTA: {idea.cta}</p>
                  </div>
                ))}
              </div>
            </div>

            <div data-export-block className="export-card export-border border border-black rounded-design p-4 bg-white">
              <h4 className="font-['Fraunces'] text-lg mb-2">Channel plan</h4>
              <p className="text-sm font-['Inter'] text-foreground/80">
                <span className="font-semibold">Primary:</span>{" "}
                {strategy.channel_plan?.primary_channel || "—"}
              </p>
              <p className="export-muted font-['Inter'] text-xs text-foreground/60 mb-1 mt-2">Secondary</p>
              <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                {(strategy.channel_plan?.secondary_channels || []).map((item, index) => (
                  <li key={`exp-secondary-${index}`}>{item}</li>
                ))}
              </ul>
              <p className="export-muted font-['Inter'] text-xs text-foreground/60 mb-1 mt-3">First 14 days</p>
              <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                {(strategy.channel_plan?.first_14_days || []).map((item, index) => (
                  <li key={`exp-first14-${index}`}>{item}</li>
                ))}
              </ul>
            </div>

            <div data-export-block className="export-card export-border border border-black rounded-design p-4 bg-white">
              <h4 className="font-['Fraunces'] text-lg mb-2">Offer</h4>
              <p className="text-sm font-['Inter'] text-foreground/80">
                <span className="font-semibold">Recommended:</span>{" "}
                {strategy.offer?.recommended_offer || "—"}
              </p>
              <p className="text-sm font-['Inter'] text-foreground/80 mt-2">
                <span className="font-semibold">Lead magnet:</span>{" "}
                {strategy.offer?.lead_magnet_idea || "—"}
              </p>
              <p className="export-muted font-['Inter'] text-xs text-foreground/60 mb-1 mt-3">
                Landing page sections
              </p>
              <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                {(strategy.offer?.landing_page_sections || []).map((item, index) => (
                  <li key={`exp-landing-${index}`}>{item}</li>
                ))}
              </ul>
            </div>

            <div data-export-block className="export-card export-border border border-black rounded-design p-4 bg-white">
              <h4 className="font-['Fraunces'] text-lg mb-2">Ad assets</h4>
              {strategy.ad_assets ? (
                <>
                  <p className="export-muted font-['Inter'] text-xs text-foreground/60 mb-1">Headlines</p>
                  <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                    {(strategy.ad_assets?.headlines || []).map((item, index) => (
                      <li key={`exp-headline-${index}`}>{item}</li>
                    ))}
                  </ul>
                  <p className="export-muted font-['Inter'] text-xs text-foreground/60 mb-1 mt-3">Primary text</p>
                  <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                    {(strategy.ad_assets?.primary_texts || []).map((item, index) => (
                      <li key={`exp-primary-${index}`}>{item}</li>
                    ))}
                  </ul>
                  <p className="export-muted font-['Inter'] text-xs text-foreground/60 mb-1 mt-3">Creative briefs</p>
                  <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                    {(strategy.ad_assets?.creative_briefs || []).map((item, index) => (
                      <li key={`exp-brief-${index}`}>{item}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-sm font-['Inter'] text-foreground/60">Not included</p>
              )}
            </div>

            <div data-export-block className="export-card export-border border border-black rounded-design p-4 bg-white">
              <h4 className="font-['Fraunces'] text-lg mb-2">Success metrics</h4>
              <p className="export-muted font-['Inter'] text-xs text-foreground/60 mb-1">KPIs</p>
              <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                {(strategy.success_metrics?.kpis || []).map((item, index) => (
                  <li key={`exp-kpi-${index}`}>{item}</li>
                ))}
              </ul>
              <p className="export-muted font-['Inter'] text-xs text-foreground/60 mb-1 mt-3">Targets</p>
              <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                {(strategy.success_metrics?.targets || []).map((item, index) => (
                  <li key={`exp-target-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
