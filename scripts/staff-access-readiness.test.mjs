import assert from "node:assert/strict";
import { test } from "node:test";
import {
  REQUIRED_ACCOUNT_COUNT,
  evaluateStaffAccessReadiness,
} from "./staff-access-readiness.mjs";

function readyEvidence(overrides = {}) {
  return {
    canonicalSourceConfirmed: true,
    authProvider: "supabase",
    supabaseClientPresent: true,
    projectActiveHealthy: true,
    backendConnectionVerified: true,
    onboardingMode: "invite-only",
    sharedInitialPassword: null,
    publicSignUpDisabled: true,
    customSmtpVerified: true,
    redirectAllowlistVerified: true,
    roleModelImplemented: true,
    rolePoliciesVerified: true,
    mfaAal2Enforced: true,
    auditReadbackVerified: true,
    approvedRosterComplete: true,
    requestedAccountCount: REQUIRED_ACCOUNT_COUNT,
    securityAdvisorWarnings: 0,
    productionWritesPerformed: false,
    usersCreated: 0,
    invitationsSent: 0,
    ...overrides,
  };
}

test("requires an evidence object", () => {
  assert.throws(() => evaluateStaffAccessReadiness(null), /must be an object/);
  assert.throws(() => evaluateStaffAccessReadiness([]), /must be an object/);
});

test("complete prepare-only evidence is ready for owner approval", () => {
  const result = evaluateStaffAccessReadiness(readyEvidence());
  assert.equal(result.status, "ready-for-owner-approval");
  assert.equal(result.safeToInvite, true);
  assert.deepEqual(result.blockers, []);
});

test("shared default passwords fail closed", () => {
  const result = evaluateStaffAccessReadiness(readyEvidence({
    sharedInitialPassword: "1234",
  }));
  assert.equal(result.safeToInvite, false);
  assert.ok(result.blockers.some(({ code }) => code === "SHARED_PASSWORD_FORBIDDEN"));
});

test("an existing project is insufficient without source, role, and MFA proof", () => {
  const result = evaluateStaffAccessReadiness(readyEvidence({
    canonicalSourceConfirmed: false,
    authProvider: "better-auth",
    supabaseClientPresent: false,
    backendConnectionVerified: false,
    roleModelImplemented: false,
    rolePoliciesVerified: false,
    mfaAal2Enforced: false,
    securityAdvisorWarnings: 2,
  }));
  assert.equal(result.safeToInvite, false);
  assert.deepEqual(
    result.blockers.map(({ code }) => code),
    [
      "SOURCE_UNCONFIRMED",
      "AUTH_PROVIDER_MISMATCH",
      "SUPABASE_CLIENT_MISSING",
      "BACKEND_UNVERIFIED",
      "ROLE_MODEL_MISSING",
      "ROLE_POLICIES_UNVERIFIED",
      "MFA_NOT_ENFORCED",
      "SECURITY_ADVISORIES_OPEN",
    ],
  );
});

test("account count and prepare-only boundaries are exact", () => {
  const result = evaluateStaffAccessReadiness(readyEvidence({
    requestedAccountCount: 4,
    productionWritesPerformed: true,
    usersCreated: 1,
    invitationsSent: 1,
  }));
  assert.equal(result.safeToInvite, false);
  assert.ok(result.blockers.some(({ code }) => code === "ACCOUNT_COUNT_MISMATCH"));
  assert.ok(result.blockers.some(({ code }) => code === "PREPARE_ONLY_BREACH"));
  assert.ok(result.blockers.some(({ code }) => code === "EXTERNAL_WRITE_DETECTED"));
});
