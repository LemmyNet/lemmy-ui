import { strict as assert } from "node:assert";
import { test } from "node:test";
import { toRateLimitEditSite } from "./rate-limits.ts";

void test("admin form saves separate IP and account resend limits, including zero", () => {
  assert.deepEqual(
    toRateLimitEditSite({
      resend_verification_email_max_requests: 10,
      resend_verification_email_interval_seconds: 120,
      resend_verification_email_per_account_max_requests: 0,
      resend_verification_email_per_account_interval_seconds: 3600,
    }),
    {
      rate_limit_resend_verification_email_max_requests: 10,
      rate_limit_resend_verification_email_interval_seconds: 120,
      rate_limit_resend_verification_email_per_account_max_requests: 0,
      rate_limit_resend_verification_email_per_account_interval_seconds: 3600,
    },
  );
});

void test("admin form omits metadata and unspecified limits", () => {
  const response = {
    local_site_id: 1,
    published_at: "2026-11-04",
    register_max_requests: 5,
  };
  assert.deepEqual(toRateLimitEditSite(response), {
    rate_limit_register_max_requests: 5,
  });
});
