# Marktr GA4 tracking plan

Property: `G-0EFXQPEYY6`. Consent Mode v2 (default denied; granted when analytics cookies are accepted). `send_page_view: false`; marktr `page_view` is sent on route change via `track()`.

All marktr product events go through `src/lib/analytics.ts` → `track(name, params)`. That helper:

- no-ops without analytics consent, without gtag, or on the Bullfinch edition
- never throws
- strips emails, names, brand/free-text, and URLs (except `page_view.page_location`)
- caps event names at 40 chars and params at 100 chars, max 25 params

Bullfinch health-check events stay on `src/lib/bullfinchAnalytics.ts` (`bf_*`). Do not mix the two.

## Add a click without new code

Put this on the clickable element:

```html
<a data-track-id="hero_card_1" data-track-location="card_1">…</a>
```

Optional: `data-track-text`, `data-track-destination`. One delegated listener fires `cta_click`.

Sections: `data-track-section="hero"`. Case studies: `data-track-case-study` + `data-track-client`.

## Identity and attribution

| What | How |
| --- | --- |
| `user_id` | Supabase `user.id` (uuid) via `gtag('set', { user_id })` on auth. Never email/name. |
| User properties | `plan` (`free` \| `trial` \| `paid`), `has_brand`, `has_icp`. Updated when plan or counts change. |
| First-touch | `utm_*` / `source` / `ref` / referrer host stored in sessionStorage always, localStorage only after analytics consent. Attached to `sign_up` and `begin_checkout`. No profile UTM column exists, so params only. |
| Guest → account | Do not re-`config` gtag on sign-in. The GA `client_id` is unchanged for the browser. |

`dashboard_first_view` uses `created_at` (skip if the account is older than 7 days) plus a per-user localStorage flag. There is no profile column for this.

## Acquisition / homepage

| Event | Params | Where it fires |
| --- | --- | --- |
| `page_view` | `page_path`, `page_location`, `page_title`, `edition` | Every marktr route change (`App.tsx` `GA4RouteTracker`) |
| `cta_click` | `cta_id`, `cta_text`, `location`, `destination` | Any `[data-track-id]` click. Locations: `header`, `hero`, `card_1`–`card_3`, `journey`, `comparison`, `case_studies`, `testimonials`, `pricing`, `footer`, `signin_modal`, plus `final_cta` for the homepage close band. |
| `section_view` | `section_id` | IntersectionObserver, 50% visible, once per page load. Sections: `hero`, `cards`, `journey`, `testimonials`, `quotes`, `case_studies`, `comparison`, `pricing`, `final_cta`. |
| `scroll_depth` | `percent` (25, 50, 75, 90) | Window scroll, once each per listener lifetime |
| `testimonial_video_play` | `testimonial_id`, `business` | Video testimonial play (`Testimonials.tsx`). `business` is the public case-study label, not a user field. |
| `case_study_view` | `client` | Case study card ≥ 60% visible, once (`CaseStudies.tsx`) |
| `resource_download` | `resource_id` | Successful download URL from `DownloadGateModal` |
| `newsletter_signup` | `source`, `location` | Successful newsletter submit (`footer` or `newsletter_landing`) |

## Guest funnel (before account)

| Event | Params | Where it fires |
| --- | --- | --- |
| `health_check_start` | — | Health check start button |
| `health_check_step` | `step_number`, `step_total` | Steps 1 (start), 2 (inputs), 3 (loading) |
| `health_check_complete` | `score_band` (`0-49`, `50-74`, `75-89`, `90-100`) | Results page, once. No URL or brand text. |
| `health_check_save_failed` | `reason` (`insert_error` \| `no_brand` \| `unknown`) | Logged-in results save failed. No PII. |
| `health_check_abandon` | `last_step` | `pagehide` / `beforeunload` if started and not completed; once per attempt |
| `brand_story_start` | — | Brand story build starts |
| `brand_story_complete` | — | Story results once a story exists |
| `icp_start` | — | Onboarding leaves the welcome step |
| `icp_complete` | `icp_count` | Onboarding generate success |
| `signup_prompt_shown` | `trigger` | In-page prompt (`after_health_check`, `after_brand_story`, `after_icp`) or auth modal (`save_results`, `header`) |
| `signin_modal_open` | `trigger` | Login / Google sign-in modal opens |

## Account

| Event | Params | Where it fires |
| --- | --- | --- |
| `sign_up` | `method` (`google` \| `email`), first-touch params | First auth of the session when the account is new (`created_at` ≈ `last_sign_in_at`) |
| `login` | `method` | First auth of the session when the account already existed |
| `onboarding_complete` | — | First `/dashboard` view after a `sign_up` in this session (per-user flag) |
| `dashboard_first_view` | — | First `/dashboard` view for an account created in the last 7 days |
| `paywall_open` | `trigger` (`trial_banner`, `locked_strategy`, `locked_content`, `pricing_page`, `upgrade`) | Paywall modal opens |
| `begin_checkout` | `plan`, first-touch params | Stripe Checkout session is created |
| `trial_start` | `plan` | Client: return to `/dashboard?checkout=success` (once per session). Server: Stripe `checkout.session.completed` while trialing / £0 |
| `purchase` | `value`, `currency`, `transaction_id`, `plan` | Server only: paid checkout or `invoice.paid`. Not fired for £0 trials. |

## Product actions

| Event | Params | Where it fires |
| --- | --- | --- |
| `strategy_generate` | — | Strategy generate succeeds |
| `content_generate` | `content_type` | Content generate succeeds |
| `content_copy` | `content_type` | Content duplicate succeeds |
| `content_export` | `content_type` | PDF export, or `list_csv` for the roster CSV |
| `icp_create` | — | ICP insert succeeds |
| `brand_create` | — | Brand insert succeeds |

## Server-side (Measurement Protocol)

`supabase/functions/stripe-webhook` sends `trial_start` / `purchase` via `supabase/functions/_shared/ga4MeasurementProtocol.ts`.

Checkout metadata (set in `create-checkout-session`): `user_id`, `ga_client_id`, `first_touch_source|medium|campaign`.

Env (Supabase secrets, never the Vite client):

```
GA4_API_SECRET=...
# optional, defaults to G-0EFXQPEYY6
GA4_MEASUREMENT_ID=G-0EFXQPEYY6
```

Set with:

```
supabase secrets set GA4_API_SECRET=...
```

Deduplicate client vs server hits in GA4 using `transaction_id` (Stripe session id or invoice id). Client `trial_start` has no `transaction_id`; treat Measurement Protocol as source of truth once `GA4_API_SECRET` is set.

## Consent denied

`track()` returns false and does not call `gtag('event', …)`. Route `page_view` is also skipped. Consent Mode remains denied.
