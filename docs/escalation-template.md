# Spec 07: Escalation Letter Template

## RTI Application Template (Maharashtra / General)

```
To,
The Public Information Officer,
[Department Name],
[Municipal Corporation / Municipal Council],
[City Name], [State].

Subject: Application under Section 6(1) of the Right to Information Act, 2005

Sir/Madam,

I, [Complainant Name], resident of [Address], hereby file this application under the Right to Information Act, 2005, seeking information regarding the following civic complaint:

Complaint Reference: [Complaint ID]
Date of Submission: [Submission Date]
Category: [Category]
Location: [Address Text] (GPS: [Lat], [Lng])
Description: [Description]

1. Please provide the current status of the above complaint as per your records.
2. Please provide copies of any action taken reports, inspection reports, or work orders issued in response to this complaint.
3. If the complaint has been marked as resolved, please provide photographic evidence or inspection reports verifying the resolution.
4. Please provide the name and designation of the officer responsible for addressing complaints in the above category for the said ward.
5. Please provide the Standard Operating Procedure (SOP) and Service Level Agreement (SLA) for addressing [Category] complaints in [Ward Name].

I am enclosing the fee of Rs. 10/- as per the RTI Act. 

Thank you,

[Complainant Name]
[Phone Number]
[Email]
[Date]

Enclosures:
1. Copy of original complaint
2. Photographs of the issue (before)
3. Photographs of claimed resolution (after) — if applicable
4. Any previous correspondence
```

## Municipal Commissioner Appeal Template

```
To,
The Municipal Commissioner,
[Municipal Corporation Name],
[City Name], [State] — [PIN Code]

Subject: Appeal regarding non-redressal of civic complaint [Complaint ID]

Respected Sir/Madam,

I wish to bring to your kind attention the following civic issue that remains unresolved despite multiple reports:

Complaint ID: [Complaint ID]
Ward: [Ward Name]
Category: [Category]
First Reported: [Date]
SLA Deadline: [SLA Date]
Days Overdue: [Days]
Number of Reports: [Weight/Attestations]

Issue Description:
[Description]

Previous Actions Taken:
- Complaint submitted on [Date]
- [Status updates if any]
- Claimed resolved on [Date] — VERIFICATION FAILED (AI score: [Score]/1.0)

The issue poses the following risk to public safety: [Severity reason from AI]

I urge your office to:
1. Direct the concerned ward officer to inspect the site personally
2. Ensure remedial action within [X] days
3. Provide a written response regarding the delay in redressal

I have attached photographic evidence, GPS coordinates, and the AI verification report for your reference.

Thank you for your attention to this matter.

Sincerely,
[Name]
[Address]
[Phone]
[Email]
[Date]
```

## Template Adapter Pattern

```typescript
// lib/agent/templates/EscalationTemplate.ts

interface TemplateData {
  complaintId: string;
  category: string;
  wardName: string;
  city: string;
  state: string;
  description: string;
  submissionDate: string;
  slaDeadline: string;
  severity: number;
  weight: number;
  verificationScore?: number;
  evidenceUrls: string[];
}

abstract class EscalationTemplate {
  abstract format: 'rti' | 'appeal' | 'commissioner';
  abstract authority: string;
  abstract generate(data: TemplateData): string;
}

class MaharashtraRTITemplate extends EscalationTemplate {
  format = 'rti' as const;
  authority = 'Public Information Officer';
  
  generate(data: TemplateData): string {
    // Populate template with data
    return `To,\nThe Public Information Officer...`;
  }
}

class GeneralCommissionerTemplate extends EscalationTemplate {
  format = 'commissioner' as const;
  authority = 'Municipal Commissioner';
  
  generate(data: TemplateData): string {
    // Populate template with data
    return `To,\nThe Municipal Commissioner...`;
  }
}

export function getTemplate(state: string, trigger: string): EscalationTemplate {
  if (trigger === 'sla_breach' || trigger === 'ghost_closure') {
    return new GeneralCommissionerTemplate();
  }
  return new MaharashtraRTITemplate(); // Default, state-extendable
}
```

## PDF Generation

```typescript
// lib/pdf/generateEscalationPdf.ts
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function generateEscalationPdf(content: string, complaintId: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  const lines = content.split('\n');
  let y = 800;
  
  for (const line of lines) {
    if (y < 50) {
      const newPage = pdfDoc.addPage([595.28, 841.89]);
      y = 800;
    }
    page.drawText(line, { x: 50, y, size: 11, font, color: rgb(0, 0, 0) });
    y -= 16;
  }
  
  return await pdfDoc.save();
}
```
