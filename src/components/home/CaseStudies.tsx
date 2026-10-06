import { CASE_STUDIES, type CaseStudy } from "@/data/caseStudies";

const CARD_TONES = ["bg-[#D4EDE8]", "bg-[#FDF0CC]", "bg-[#FAE8E0]", "bg-white", "bg-[#E7ECF8]"] as const;

function CaseStudyCard({ study, tone }: { study: CaseStudy; tone: string }) {
  const pills = (study.pills ?? []).slice(0, 2);

  return (
    <article className={`case-study-card flex h-full min-w-0 flex-col rounded-2xl p-6 text-left shadow-sm sm:p-7 ${tone}`}>
      {study.imageSrc ? (
        <div className="mb-5 aspect-[2/1] w-full overflow-hidden rounded-lg bg-white/60">
          <img
            src={study.imageSrc}
            alt={study.imageAlt ?? ""}
            width={1600}
            height={800}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}

      <p className="font-['Fraunces'] text-4xl font-bold leading-none text-[#101A26] sm:text-5xl">{study.headline}</p>
      <p className="mt-3 font-['Plus_Jakarta_Sans'] text-sm leading-snug text-[#101A26]/80">{study.label}</p>
      {study.period ? (
        <p className="mt-2 font-['Plus_Jakarta_Sans'] text-xs leading-relaxed text-[#101A26]/60">{study.period}</p>
      ) : null}

      <p className="mt-5 font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-widest text-[#101A26]/70">
        {study.client}
      </p>

      {pills.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {pills.map((pill) => (
            <li
              key={pill}
              className="rounded-full border border-[#101A26] bg-[#E8F455] px-2.5 py-1 font-['Plus_Jakarta_Sans'] text-[11px] font-medium text-[#101A26]"
            >
              {pill}
            </li>
          ))}
        </ul>
      ) : null}

      {study.description ? (
        <p className="mt-4 font-['Plus_Jakarta_Sans'] text-sm leading-relaxed text-[#101A26]/80">{study.description}</p>
      ) : null}

      {study.supporting.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {study.supporting.map((item) => (
            <li key={item} className="font-['Plus_Jakarta_Sans'] text-xs leading-relaxed text-[#101A26]/75">
              {item}
            </li>
          ))}
        </ul>
      ) : null}

      {study.footnote ? (
        <p className="mt-4 font-['Plus_Jakarta_Sans'] text-[11px] leading-relaxed text-[#101A26]/55">{study.footnote}</p>
      ) : null}
    </article>
  );
}

export default function CaseStudies() {
  return (
    <section className="bg-[#FBFAF0] px-6 py-20 lg:py-28">
      <div className="mx-auto max-w-[90rem] text-center">
        <h2 className="font-['Fraunces'] text-4xl font-bold text-[#101A26] sm:text-5xl">
          Proven results, real founders
        </h2>
        <p className="mt-4 font-['Plus_Jakarta_Sans'] text-base text-[#101A26]/75">
          Real results from businesses using marktr.io.
        </p>
      </div>

      <div className="mx-auto mt-14 grid max-w-[90rem] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 lg:gap-5">
        {CASE_STUDIES.map((study, index) => (
          <CaseStudyCard key={study.id} study={study} tone={CARD_TONES[index % CARD_TONES.length]} />
        ))}
      </div>
    </section>
  );
}
