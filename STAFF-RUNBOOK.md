# Staff runbook — documenting a visit

This chart is for **Von & Bick Healthcare Associates** remote staff. Patients do not book here. Start the video visit in **Zoom Healthcare**, then document in EduVerse.

## 1. Sign in

1. Open the staff URL and choose **Staff sign in**.
2. Use your work email and password, or **Email me a sign-in link** (requires practice SMTP).
3. Sessions expire after 8 hours. Sign out on shared devices.

Seed QA accounts (passwords in the README) are for training databases only.

## 2. Confirm the individual

1. Open **Caseload**.
2. Select the person you are seeing. Seed people are labeled **SYNTHETIC** (Jane Demo, John Demo, Alex Demo).
3. Opening a chart writes an `INDIVIDUAL_VIEW` audit event.

## 3. Open or create the visit

1. **Create visit** from the dashboard, caseload, or chart.
2. Choose type:
   - **MEDICAL** — RN / LPN / MA SOAP
   - **BEHAVIORAL_HEALTH** — BH progress
   - **DSP_SHIFT** — DSP/CLS shift documentation
3. Enter the scheduled time and the focus of the encounter.
4. Location defaults to “Zoom Healthcare (video only)” for telehealth, or community/CLS for shifts.

## 4. Write the note

1. Open the visit and **Start … note**.
2. Complete the sections:
   - SOAP: Subjective, Objective, Assessment, Plan
   - BH: Presentation, Interventions, Response, Risk, Plan
   - DSP: Shift times, supports, ADLs, incidents, narrative
3. **Save draft** as you go. Drafts can be edited by the author or an admin.
4. Do not paste Zoom chat or extra identifiers you do not need.

## 5. Sign and lock

1. When the note is complete, choose **Sign and lock**.
2. Confirm. The note can no longer be edited. The visit is marked completed.
3. **Export PDF** for printing or upload to another record system if the practice requires a copy.

## 6. Audit

Administrators and read-only auditors open **Audit** to see who created, viewed, updated, locked, or exported a note. The table shows times, actors, actions, and record ids — not note text.

## Role limits

| Role | Can write | Can lock | Can see audit |
| --- | --- | --- | --- |
| Administrator | All note types | Yes | Yes |
| Clinician (RN/LPN/MA/BH) | SOAP and BH | Own drafts | No |
| DSP / CLS | Shift notes only | Own drafts | No |
| Auditor | No | No | Yes |

## Emergencies

This application does not replace 911 or crisis protocols. If someone is in immediate danger, call 911 (or the local crisis line) and follow VBHC emergency policy.

## Support

Practice office: info.officeadmin@vbhealthcare.org · 470-256-3897  
2133 Lawrenceville-Suwanee Rd, Suwanee, GA 30024
