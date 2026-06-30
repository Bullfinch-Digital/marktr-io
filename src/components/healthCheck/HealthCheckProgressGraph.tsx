import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { HEALTH_CHECK_SCORER_VERSION } from "../../lib/healthCheck";
import { formatHealthCheckDate } from "../../lib/healthCheckPersistence";
import type { HealthCheckRow } from "../../lib/healthCheckPersistence";
import {
  buildComparableProgressPoints,
  HEALTH_PROGRESS_LINE_COLORS,
  HEALTH_PROGRESS_METRIC_LABELS,
  type HealthProgressChartMode,
  type HealthProgressChartPoint,
  type HealthProgressMetric,
} from "../../lib/healthCheckProgressGraph";

const Y_DOMAIN: [number, number] = [0, 100];
const Y_TICKS = [0, 25, 50, 75, 100];

const SINGLE_METRICS: HealthProgressMetric[] = [
  "overall",
  "website",
  "brandStory",
  "content",
  "social",
];

type HealthCheckProgressGraphProps = {
  rows: HealthCheckRow[];
  loading?: boolean;
};

type TooltipPayload = {
  payload?: HealthProgressChartPoint;
};

function ProgressTooltip({
  active,
  payload,
  mode,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  mode: HealthProgressChartMode;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  if (!point) return null;

  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-sm">
      <p className="font-['DM_Sans'] text-xs text-muted-foreground">
        {formatHealthCheckDate(point.createdAt)}
      </p>
      {mode === "all" ? (
        <ul className="mt-1 space-y-0.5">
          {SINGLE_METRICS.map((key) => (
            <li
              key={key}
              className="font-['DM_Sans'] text-xs"
              style={{ color: HEALTH_PROGRESS_LINE_COLORS[key] }}
            >
              {HEALTH_PROGRESS_METRIC_LABELS[key]}: {point[key]}
            </li>
          ))}
        </ul>
      ) : (
        <p
          className="mt-0.5 font-['Fraunces'] text-lg font-bold"
          style={{ color: HEALTH_PROGRESS_LINE_COLORS[mode] }}
        >
          {point[mode]}
        </p>
      )}
    </div>
  );
}

function MetricToggle({
  mode,
  onChange,
}: {
  mode: HealthProgressChartMode;
  onChange: (mode: HealthProgressChartMode) => void;
}) {
  const options: { id: HealthProgressChartMode; label: string }[] = [
    ...SINGLE_METRICS.map((id) => ({ id, label: HEALTH_PROGRESS_METRIC_LABELS[id] })),
    { id: "all", label: "All five" },
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(({ id, label }) => {
        const selected = mode === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`rounded-full border px-2.5 py-1 font-['DM_Sans'] text-[10px] transition-colors ${
              selected
                ? "border-[#0D1833] bg-[#0D1833] text-white"
                : "border-border bg-white text-muted-foreground hover:border-[#0D1833]/40 hover:text-foreground"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function HealthCheckProgressGraph({ rows, loading = false }: HealthCheckProgressGraphProps) {
  const [mode, setMode] = useState<HealthProgressChartMode>("overall");

  const points = useMemo(
    () => buildComparableProgressPoints(rows, HEALTH_CHECK_SCORER_VERSION),
    [rows]
  );

  const showTrend = points.length >= 2;

  return (
    <section className="mt-8 border-t border-border pt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-['Fraunces'] text-lg font-semibold text-[#0D1833]">
            Progress over time
          </h2>
          <p className="mt-1 font-['DM_Sans'] text-xs text-muted-foreground">
            Same scoring method only — a rise means your site improved.
          </p>
        </div>
        {!loading && points.length > 0 && (
          <MetricToggle mode={mode} onChange={setMode} />
        )}
      </div>

      {loading ? (
        <p className="mt-4 font-['DM_Sans'] text-xs text-muted-foreground">Loading…</p>
      ) : !showTrend ? (
        <p className="mt-4 font-['DM_Sans'] text-sm text-muted-foreground">
          Run another health check to see your progress over time.
        </p>
      ) : (
        <div className="mt-4 h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="#e8e8e8" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="dateLabel"
                tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "DM Sans, sans-serif" }}
                axisLine={{ stroke: "#e5e7eb" }}
                tickLine={false}
                dy={6}
              />
              <YAxis
                domain={Y_DOMAIN}
                ticks={Y_TICKS}
                tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "DM Sans, sans-serif" }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip
                content={({ active, payload }) => (
                  <ProgressTooltip active={active} payload={payload} mode={mode} />
                )}
              />
              {mode === "all" ? (
                <>
                  <Legend
                    verticalAlign="bottom"
                    height={28}
                    iconType="line"
                    iconSize={10}
                    wrapperStyle={{
                      fontFamily: "DM Sans, sans-serif",
                      fontSize: 10,
                      paddingTop: 8,
                    }}
                  />
                  {SINGLE_METRICS.map((key) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={HEALTH_PROGRESS_METRIC_LABELS[key]}
                      stroke={HEALTH_PROGRESS_LINE_COLORS[key]}
                      strokeWidth={key === "overall" ? 2 : 1.5}
                      dot={{ r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      isAnimationActive={false}
                    />
                  ))}
                </>
              ) : (
                <Line
                  type="monotone"
                  dataKey={mode}
                  stroke={HEALTH_PROGRESS_LINE_COLORS[mode]}
                  strokeWidth={2}
                  dot={{ r: 3.5, fill: HEALTH_PROGRESS_LINE_COLORS[mode], strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
