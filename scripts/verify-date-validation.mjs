import assert from "node:assert/strict";
import { createServer } from "vite";
import { resolve } from "node:path";

console.log("=== UIC Certificate Date Validation & Decoupling Test Suite ===");

const root = process.cwd();
const server = await createServer({
  configFile: false,
  root,
  resolve: { alias: { "@": resolve(root, "src") } },
  server: { middlewareMode: true },
  optimizeDeps: { noDiscovery: true, include: [], entries: [] },
  appType: "custom",
  logLevel: "error",
});

const { extractDateOnly } = await server.ssrLoadModule("/src/lib/dates.ts");
const { findRolePreset, getDefaultRecipientCategory } = await server.ssrLoadModule("/src/lib/certificateRoles.ts");
const { getCertificateFamily } = await server.ssrLoadModule("/src/lib/certificateCategories.ts");

// 1. Timezone-Safe Date Extraction
{
  console.log("\n[Test 1] extractDateOnly - Timezone & ISO Format Consistency");
  const isoUtc = "2026-10-31T18:30:00.000Z"; // In IST (+05:30) this is 2026-11-01 00:00:00
  const extracted = extractDateOnly(isoUtc);
  assert.equal(extracted, "2026-11-01", `Expected 2026-11-01 for IST conversion, got ${extracted}`);

  const plainDate = "2026-10-25";
  assert.equal(extractDateOnly(plainDate), "2026-10-25");

  const isoDay = "2026-10-25T10:00:00.000Z";
  assert.equal(extractDateOnly(isoDay), "2026-10-25");
  console.log("  ✓ Correctly extracts calendar dates in SRM AP institutional timezone");
}

// 2. Role Preset & Category Decoupling
{
  console.log("\n[Test 2] Role Preset & Category Decoupling");
  const preset = findRolePreset("participant-appreciation");
  assert.ok(preset, "participant-appreciation preset should exist");
  assert.equal(preset.defaultTitle, "CERTIFICATE OF APPRECIATION");
  assert.equal(preset.defaultCertificateType, "Certificate of Appreciation");

  const category = getDefaultRecipientCategory(preset.id);
  assert.equal(category, "participant", "Must map to participant category, NOT organizer");

  const family = getCertificateFamily("participant");
  assert.equal(family, "participant");
  console.log("  ✓ Participant Appreciation role preserves 'participant' category");
}

// 3. Date Chronology Business Logic Simulation
{
  console.log("\n[Test 3] Date Chronology & Controlled Administrator Override Rules");

  function validateChronology({ eventDate, issueDate, recipientCategory, dateOverride, createdBy }) {
    const eventDay = extractDateOnly(eventDate);
    const issueDay = issueDate ? extractDateOnly(issueDate) : extractDateOnly(new Date().toISOString());

    const isIssueBeforeEvent = Boolean(eventDay && issueDay && issueDay < eventDay);
    const isParticipantCategory = recipientCategory === "participant" || recipientCategory === "winner";

    let hasValidOverride = false;
    if (isIssueBeforeEvent) {
      if (dateOverride?.confirmed && dateOverride.reason?.trim()) {
        if (!createdBy) {
          throw new Error("An authorized administrator ID is required to apply a date validation override.");
        }
        hasValidOverride = true;
      } else if (isParticipantCategory) {
        throw new Error(
          `This participant certificate is dated (${issueDay}) before the event date (${eventDay}). Adjust the issue date to on or after the event date, or provide an authorized administrator override reason.`
        );
      }
    }

    return {
      success: true,
      hasValidOverride,
      eventDay,
      issueDay,
      overrideReason: hasValidOverride ? dateOverride.reason.trim() : null,
      overrideBy: hasValidOverride ? createdBy : null,
    };
  }

  // Case 1: Event already concluded
  {
    const res = validateChronology({
      eventDate: "2026-10-20",
      issueDate: "2026-10-31",
      recipientCategory: "participant",
    });
    assert.equal(res.success, true);
    assert.equal(res.hasValidOverride, false);
    console.log("  ✓ Case 1: Concluded event passes date validation cleanly without override");
  }

  // Case 2: Upcoming event without override -> must throw descriptive error
  {
    assert.throws(
      () =>
        validateChronology({
          eventDate: "2026-11-15",
          issueDate: "2026-10-31",
          recipientCategory: "participant",
        }),
      /dated \(2026-10-31\) before the event date \(2026-11-15\)/
    );
    console.log("  ✓ Case 2: Upcoming event blocks participant certificate with clear date discrepancy error");
  }

  // Case 3: Upcoming event with authorized admin override -> succeeds and records reason
  {
    const res = validateChronology({
      eventDate: "2026-11-15",
      issueDate: "2026-10-31",
      recipientCategory: "participant",
      dateOverride: {
        confirmed: true,
        reason: "Authorized advance appreciation for milestone hackathon presentation",
      },
      createdBy: "admin-user-uuid-1234",
    });
    assert.equal(res.success, true);
    assert.equal(res.hasValidOverride, true);
    assert.equal(res.overrideBy, "admin-user-uuid-1234");
    assert.equal(res.overrideReason, "Authorized advance appreciation for milestone hackathon presentation");
    console.log("  ✓ Case 3: Controlled admin override succeeds with recorded reason and admin ID");
  }

  // Case 4: Override attempted by unauthenticated / unauthorized user
  {
    assert.throws(
      () =>
        validateChronology({
          eventDate: "2026-11-15",
          issueDate: "2026-10-31",
          recipientCategory: "participant",
          dateOverride: { confirmed: true, reason: "Bypass test" },
          createdBy: null,
        }),
      /authorized administrator ID is required/
    );
    console.log("  ✓ Case 4: Unauthorized override attempt is strictly blocked");
  }

  // Case 5: Override checkbox checked but empty reason
  {
    assert.throws(
      () =>
        validateChronology({
          eventDate: "2026-11-15",
          issueDate: "2026-10-31",
          recipientCategory: "participant",
          dateOverride: { confirmed: true, reason: "   " },
          createdBy: "admin-user-uuid-1234",
        }),
      /dated \(2026-10-31\) before the event date \(2026-11-15\)/
    );
    console.log("  ✓ Case 5: Blank override reason is rejected");
  }

  // Case 6: Organizer advance certificate
  {
    const res = validateChronology({
      eventDate: "2026-11-15",
      issueDate: "2026-10-31",
      recipientCategory: "organizer",
    });
    assert.equal(res.success, true);
    assert.equal(res.hasValidOverride, false);
    console.log("  ✓ Case 6: Organizer certificates permit advance preparation");
  }
}

await server.close();
console.log("\nAll 6 validation & decoupling test suites passed successfully!\n");
process.exit(0);


// 1. Timezone-Safe Date Extraction
{
  console.log("\n[Test 1] extractDateOnly - Timezone & ISO Format Consistency");
  const isoUtc = "2026-10-31T18:30:00.000Z"; // In IST (+05:30) this is 2026-11-01 00:00:00
  const extracted = extractDateOnly(isoUtc);
  assert.equal(extracted, "2026-11-01", `Expected 2026-11-01 for IST conversion, got ${extracted}`);

  const plainDate = "2026-10-25";
  assert.equal(extractDateOnly(plainDate), "2026-10-25");

  const isoDay = "2026-10-25T10:00:00.000Z";
  assert.equal(extractDateOnly(isoDay), "2026-10-25");
  console.log("  ✓ Correctly extracts calendar dates in SRM AP institutional timezone");
}

// 2. Role Preset & Category Decoupling
{
  console.log("\n[Test 2] Role Preset & Category Decoupling");
  const preset = findRolePreset("participant-appreciation");
  assert.ok(preset, "participant-appreciation preset should exist");
  assert.equal(preset.defaultTitle, "CERTIFICATE OF APPRECIATION");
  assert.equal(preset.defaultCertificateType, "Certificate of Appreciation");

  const category = getDefaultRecipientCategory(preset.id);
  assert.equal(category, "participant", "Must map to participant category, NOT organizer");

  const family = getCertificateFamily("participant");
  assert.equal(family, "participant");
  console.log("  ✓ Participant Appreciation role preserves 'participant' category");
}

// 3. Date Chronology Business Logic Simulation
{
  console.log("\n[Test 3] Date Chronology & Controlled Administrator Override Rules");

  function validateChronology({ eventDate, issueDate, recipientCategory, dateOverride, createdBy }) {
    const eventDay = extractDateOnly(eventDate);
    const issueDay = issueDate ? extractDateOnly(issueDate) : extractDateOnly(new Date().toISOString());

    const isIssueBeforeEvent = Boolean(eventDay && issueDay && issueDay < eventDay);
    const isParticipantCategory = recipientCategory === "participant" || recipientCategory === "winner";

    let hasValidOverride = false;
    if (isIssueBeforeEvent) {
      if (dateOverride?.confirmed && dateOverride.reason?.trim()) {
        if (!createdBy) {
          throw new Error("An authorized administrator ID is required to apply a date validation override.");
        }
        hasValidOverride = true;
      } else if (isParticipantCategory) {
        throw new Error(
          `This participant certificate is dated (${issueDay}) before the event date (${eventDay}). Adjust the issue date to on or after the event date, or provide an authorized administrator override reason.`
        );
      }
    }

    return {
      success: true,
      hasValidOverride,
      eventDay,
      issueDay,
      overrideReason: hasValidOverride ? dateOverride.reason.trim() : null,
      overrideBy: hasValidOverride ? createdBy : null,
    };
  }

  // Case 1: Event already concluded
  {
    const res = validateChronology({
      eventDate: "2026-10-20",
      issueDate: "2026-10-31",
      recipientCategory: "participant",
    });
    assert.equal(res.success, true);
    assert.equal(res.hasValidOverride, false);
    console.log("  ✓ Case 1: Concluded event passes date validation cleanly without override");
  }

  // Case 2: Upcoming event without override -> must throw descriptive error
  {
    assert.throws(
      () =>
        validateChronology({
          eventDate: "2026-11-15",
          issueDate: "2026-10-31",
          recipientCategory: "participant",
        }),
      /dated \(2026-10-31\) before the event date \(2026-11-15\)/
    );
    console.log("  ✓ Case 2: Upcoming event blocks participant certificate with clear date discrepancy error");
  }

  // Case 3: Upcoming event with authorized admin override -> succeeds and records reason
  {
    const res = validateChronology({
      eventDate: "2026-11-15",
      issueDate: "2026-10-31",
      recipientCategory: "participant",
      dateOverride: {
        confirmed: true,
        reason: "Authorized advance appreciation for milestone hackathon presentation",
      },
      createdBy: "admin-user-uuid-1234",
    });
    assert.equal(res.success, true);
    assert.equal(res.hasValidOverride, true);
    assert.equal(res.overrideBy, "admin-user-uuid-1234");
    assert.equal(res.overrideReason, "Authorized advance appreciation for milestone hackathon presentation");
    console.log("  ✓ Case 3: Controlled admin override succeeds with recorded reason and admin ID");
  }

  // Case 4: Override attempted by unauthenticated / unauthorized user
  {
    assert.throws(
      () =>
        validateChronology({
          eventDate: "2026-11-15",
          issueDate: "2026-10-31",
          recipientCategory: "participant",
          dateOverride: { confirmed: true, reason: "Bypass test" },
          createdBy: null,
        }),
      /authorized administrator ID is required/
    );
    console.log("  ✓ Case 4: Unauthorized override attempt is strictly blocked");
  }

  // Case 5: Override checkbox checked but empty reason
  {
    assert.throws(
      () =>
        validateChronology({
          eventDate: "2026-11-15",
          issueDate: "2026-10-31",
          recipientCategory: "participant",
          dateOverride: { confirmed: true, reason: "   " },
          createdBy: "admin-user-uuid-1234",
        }),
      /dated \(2026-10-31\) before the event date \(2026-11-15\)/
    );
    console.log("  ✓ Case 5: Blank override reason is rejected");
  }

  // Case 6: Organizer advance certificate
  {
    const res = validateChronology({
      eventDate: "2026-11-15",
      issueDate: "2026-10-31",
      recipientCategory: "organizer",
    });
    assert.equal(res.success, true);
    assert.equal(res.hasValidOverride, false);
    console.log("  ✓ Case 6: Organizer certificates permit advance preparation");
  }
}

console.log("\nAll 6 validation & decoupling test suites passed successfully!\n");
