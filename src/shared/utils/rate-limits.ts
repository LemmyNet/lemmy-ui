import type { EditSite, LocalSiteRateLimit } from "lemmy-js-client";

export const rateLimitTypes = [
  "message",
  "post",
  "register",
  "image",
  "comment",
  "search",
  "import_user_settings",
  "resend_verification_email",
  "resend_verification_email_per_account",
] as const;

export type RateLimitType = (typeof rateLimitTypes)[number];

// Additive API fields until lemmy-js-client publishes the updated site types.
interface VerificationEmailRateLimits {
  resend_verification_email_max_requests?: number;
  resend_verification_email_interval_seconds?: number;
  resend_verification_email_per_account_max_requests?: number;
  resend_verification_email_per_account_interval_seconds?: number;
}

export type SiteRateLimits = LocalSiteRateLimit & VerificationEmailRateLimits;
export type RateLimitFormValues = Partial<
  Omit<SiteRateLimits, "local_site_id" | "updated_at" | "published_at">
>;
type EditRateLimits = EditSite & {
  [K in keyof VerificationEmailRateLimits as `rate_limit_${K}`]?: number;
};

export function toRateLimitEditSite(form: RateLimitFormValues): EditRateLimits {
  const result: EditRateLimits = {};
  for (const type of rateLimitTypes) {
    const max = form[`${type}_max_requests`];
    const interval = form[`${type}_interval_seconds`];
    if (max !== undefined) {
      result[`rate_limit_${type}_max_requests`] = max;
    }
    if (interval !== undefined) {
      result[`rate_limit_${type}_interval_seconds`] = interval;
    }
  }
  return result;
}
