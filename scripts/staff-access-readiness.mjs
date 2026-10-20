#!/usr/bin/env node
/**
 * Prepare-only gate for the five approved office accounts.
 *
 * This check never creates users, sends invitations, reads credentials, or
 * changes an authentication project. It evaluates sanitized evidence and fails
 * closed until invitation-only onboarding, role authorization, MFA, and source
 * linkage are independently demonstrated.
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const REQUIRED_ACCOUNT_COUNT = 5;

function blocker(blockers, condition, code, message) {
  if (condition) blockers.push({ code, message });
}

function count(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function evaluateStaffAccessReadiness(evidence) {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    throw new TypeError("Staff access evidence must be an object.");
  }

  const blockers = [];
  const requestedAccountCount = count(evidence.requestedAccountCount);
  const usersCreated = count(evidence.usersCreated);
  const invitationsSent = count(evidence.invitationsSent);
  const advisorWarnings = count(evidence.securityAdvisorWarnings);

  blocker(blockers, evidence.canonicalSourceConfirmed !== true, "SOURCE_UNCONFIRMED",
    "Canonical website source and deployment commit are not confirmed.");
  blocker(blockers, evidence.authProvider !== "supabase", "AUTH_PROVIDER_MISMATCH",
    "The website source is not yet wired to the approved Supabase Auth project.");
  blocker(blockers, evidence.supabaseClientPresent !== true, "SUPABASE_CLIENT_MISSING",
    "The source does not include a pinned Supabase client integration.");
  blocker(blockers, evidence.projectActiveHealthy !== true, "PROJECT_NOT_HEALTHY",
    "The selected authentication project is not verified active and healthy.");
  blocker(blockers, evidence.backendConnectionVerified !== true, "BACKEND_UNVERIFIED",
    "Website-to-auth-project connectivity has not been independently verified.");
  blocker(blockers, evidence.onboardingMode !== "invite-only", "INVITE_ONLY_REQUIRED",
    "Staff onboarding must be invitation-only.");
  blocker(blockers,
    typeof evidence.sharedInitialPassword === "string" && evidence.sharedInitialPassword.length > 0,
    "SHARED_PASSWORD_FORBIDDEN",
    "A shared or default initial password is forbidden.");
  blocker(blockers, evidence.publicSignUpDisabled !== true, "PUBLIC_SIGNUP_NOT_DISABLED",
    "Public self-registration must be disabled for office accounts.");
  blocker(blockers, evidence.customSmtpVerified !== true, "SMTP_UNVERIFIED",
    "Invitation delivery through approved SMTP is not verified.");
  blocker(blockers, evidence.redirectAllowlistVerified !== true, "REDIRECT_UNVERIFIED",
    "Invitation redirect URLs are not verified against the allowlist.");
  blocker(blockers, evidence.roleModelImplemented !== true, "ROLE_MODEL_MISSING",
    "Server-side role assignments and least-privilege enforcement are not implemented.");
  blocker(blockers, evidence.rolePoliciesVerified !== true, "ROLE_POLICIES_UNVERIFIED",
    "Role policies and row-level authorization have not passed readback verification.");
  blocker(blockers, evidence.mfaAal2Enforced !== true, "MFA_NOT_ENFORCED",
    "MFA assurance level 2 is not enforced across the UI, API, and database.");
  blocker(blockers, evidence.auditReadbackVerified !== true, "AUDIT_UNVERIFIED",
    "Invitation, acceptance, role, and MFA audit readback is not verified.");
  blocker(blockers, evidence.approvedRosterComplete !== true, "ROSTER_INCOMPLETE",
    "The approved work-email and role roster is incomplete.");
  blocker(blockers, requestedAccountCount !== REQUIRED_ACCOUNT_COUNT, "ACCOUNT_COUNT_MISMATCH",
    `The approved activation packet must cover exactly ${REQUIRED_ACCOUNT_COUNT} accounts.`);
  blocker(blockers, advisorWarnings === null || advisorWarnings > 0, "SECURITY_ADVISORIES_OPEN",
    "Security advisor warnings must be reviewed and resolved or explicitly accepted.");
  blocker(blockers, evidence.productionWritesPerformed !== false, "PREPARE_ONLY_BREACH",
    "The readiness run must not create users, send invitations, or change production.");
  blocker(blockers, usersCreated !== 0 || invitationsSent !== 0, "EXTERNAL_WRITE_DETECTED",
    "No users or invitations may exist before final owner approval.");

  return {
    status: blockers.length === 0 ? "ready-for-owner-approval" : "blocked",
    safeToInvite: blockers.length === 0,
    requestedAccountCount,
    usersCreated,
    invitationsSent,
    blockers,
    limitations: [
      "Readiness evidence only; this check does not create accounts or send invitations.",
      "A ready result still requires LaVette's explicit go-live approval.",
      "Clinical, hiring, compliance, and billing decisions remain human-controlled.",
    ],
  };
}

async function main(argv) {
  if (argv.length !== 1) {
    throw new Error("Usage: node scripts/staff-access-readiness.mjs <evidence.json>");
  }
  const evidence = JSON.parse(readFileSync(argv[0], "utf8"));
  const result = evaluateStaffAccessReadiness(evidence);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.safeToInvite ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 2;
  });
}
