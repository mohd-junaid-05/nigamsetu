// =====================================================================
// NigamSetu: Escalation Template Adapter Pattern
// File: lib/agent/templates/EscalationTemplate.ts
// =====================================================================

export interface TemplateData {
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
  verificationScore?: number | null;
  verificationReason?: string | null;
  evidenceUrls?: string[];
  addressText?: string | null;
  location?: [number, number];
  complainantName?: string;
  phone?: string;
  email?: string;
  daysOverdue?: number;
  severityReason?: string;
  claimedResolutionDate?: string;
}

export abstract class EscalationTemplate {
  abstract format: 'rti' | 'appeal' | 'commissioner' | 'ward_officer';
  abstract authority: 'municipal_commissioner' | 'ward_officer' | 'rti';
  abstract authorityTitle: string;
  abstract statutoryDays: number;
  abstract generate(data: TemplateData): string;
}

/**
 * RTI Application Template (Maharashtra / General)
 * Application under Section 6(1) of the Right to Information Act, 2005
 * Default statutory response window: 30 days
 */
export class MaharashtraRTITemplate extends EscalationTemplate {
  format = 'rti' as const;
  authority = 'rti' as const;
  authorityTitle = 'Public Information Officer';
  statutoryDays = 30;

  generate(data: TemplateData): string {
    const lat = data.location ? data.location[0].toFixed(5) : 'N/A';
    const lng = data.location ? data.location[1].toFixed(5) : 'N/A';
    const complainantName = data.complainantName || 'Concerned Citizen / Ward Resident';
    const address = data.addressText || `${data.wardName}, ${data.city}, ${data.state}`;
    const phone = data.phone || 'Provided via NigamSetu Citizen Portal';
    const email = data.email || 'records@nigamsetu.org.in';
    const today = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return `To,
The Public Information Officer,
Department of Municipal Grievance Redressal,
Municipal Corporation of ${data.city || 'Greater Mumbai'},
${data.city || 'Mumbai'}, ${data.state || 'Maharashtra'}.

Subject: Application under Section 6(1) of the Right to Information Act, 2005

Sir/Madam,

I, ${complainantName}, resident of ${address}, hereby file this application under the Right to Information Act, 2005, seeking information regarding the following civic complaint:

Complaint Reference: ${data.complaintId}
Date of Submission: ${data.submissionDate}
Category: ${data.category.toUpperCase()}
Location: ${data.addressText || 'Designated Ward Location'} (GPS: ${lat}, ${lng})
Description: ${data.description || 'Public infrastructure defect posing continuous civic disruption.'}

1. Please provide the current status of the above complaint as per your records.
2. Please provide copies of any action taken reports, inspection reports, or work orders issued in response to this complaint.
3. If the complaint has been marked as resolved, please provide photographic evidence or inspection reports verifying the resolution.
4. Please provide the name and designation of the officer responsible for addressing complaints in the above category for ${data.wardName}.
5. Please provide the Standard Operating Procedure (SOP) and Service Level Agreement (SLA) for addressing ${data.category} complaints in ${data.wardName}.

I am enclosing the fee of Rs. 10/- as per the RTI Act.

Thank you,

${complainantName}
${phone}
${email}
Date: ${today}

Enclosures:
1. Copy of original complaint (Ref: #${data.complaintId})
2. Photographs of the issue (before)
3. Photographs of claimed resolution (after) — if applicable
4. Any previous correspondence and SLA breach records`;
  }
}

/**
 * Municipal Commissioner Appeal Template
 * Formal administrative appeal for unresolved or falsely resolved complaints
 * Default statutory response window: 15 days
 */
export class GeneralCommissionerTemplate extends EscalationTemplate {
  format = 'commissioner' as const;
  authority = 'municipal_commissioner' as const;
  authorityTitle = 'The Municipal Commissioner';
  statutoryDays = 15;

  generate(data: TemplateData): string {
    const complainantName = data.complainantName || 'Ward Resident / Civic Redressal Applicant';
    const address = data.addressText || `${data.wardName}, ${data.city}, ${data.state}`;
    const phone = data.phone || 'Provided via NigamSetu Citizen Portal';
    const email = data.email || 'records@nigamsetu.org.in';
    const today = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const daysOverdue =
      data.daysOverdue !== undefined
        ? data.daysOverdue
        : Math.max(1, Math.round((Date.now() - new Date(data.slaDeadline || data.submissionDate).getTime()) / (1000 * 3600 * 24)));

    const scoreDisplay =
      typeof data.verificationScore === 'number'
        ? `${(data.verificationScore * 100).toFixed(0)}% (${data.verificationScore.toFixed(2)}/1.0)`
        : '0.0/1.0 (Failed Audit)';

    const verificationNote =
      data.verificationScore !== undefined && data.verificationScore !== null
        ? `- Claimed resolved on ${data.claimedResolutionDate || 'Recent Date'} — VERIFICATION FAILED (AI Evidence Score: ${scoreDisplay})\n- Verification Finding: ${data.verificationReason || 'After-photo failed visual/spatial verification test against reported defect'}`
        : `- SLA Deadline breached on ${data.slaDeadline}: Overdue by ${daysOverdue} days without verified physical completion.`;

    const riskNote =
      data.severityReason ||
      (data.severity >= 3
        ? 'High public hazard posing immediate traffic, health, or infrastructure safety jeopardy.'
        : 'Ongoing civic impairment impacting residents, daily transit, and municipal hygiene.');

    return `To,
The Municipal Commissioner,
Municipal Corporation of ${data.city || 'Greater Mumbai'},
${data.city || 'Mumbai'}, ${data.state || 'Maharashtra'} — 400001

Subject: Appeal regarding non-redressal of civic complaint ${data.complaintId}

Respected Sir/Madam,

I wish to bring to your kind attention the following civic issue that remains unresolved despite multiple reports:

Complaint ID: ${data.complaintId}
Ward: ${data.wardName}
Category: ${data.category.toUpperCase()}
First Reported: ${data.submissionDate}
SLA Deadline: ${data.slaDeadline}
Days Overdue: ${daysOverdue}
Number of Reports: ${data.weight || 1}

Issue Description:
${data.description || 'Civic infrastructure breakdown causing significant public distress and hazardous conditions.'}

Previous Actions Taken:
- Complaint submitted on ${data.submissionDate}
${verificationNote}

The issue poses the following risk to public safety: ${riskNote}

I urge your office to:
1. Direct the concerned ward officer to inspect the site personally.
2. Ensure remedial action within 7 days.
3. Provide a written response regarding the delay in redressal.

I have attached photographic evidence, GPS coordinates, and the AI verification report for your reference.

Thank you for your attention to this matter.

Sincerely,
${complainantName}
${address}
${phone}
${email}
Date: ${today}`;
  }
}

/**
 * Ward Officer Urgent Grievance Notice Template
 * Operational notice to the local ward assistant commissioner
 * Default statutory response window: 7 days
 */
export class WardOfficerTemplate extends EscalationTemplate {
  format = 'ward_officer' as const;
  authority = 'ward_officer' as const;
  authorityTitle = 'The Ward Officer / Assistant Commissioner';
  statutoryDays = 7;

  generate(data: TemplateData): string {
    const complainantName = data.complainantName || 'Concerned Ward Resident';
    const address = data.addressText || `${data.wardName}, ${data.city}, ${data.state}`;
    const today = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return `To,
The Ward Officer / Assistant Commissioner,
${data.wardName},
Municipal Corporation of ${data.city || 'Greater Mumbai'},
${data.city || 'Mumbai'}, ${data.state || 'Maharashtra'}.

Subject: Urgent Grievance Notice: Overdue civic complaint #${data.complaintId}

Dear Sir/Madam,

This is a formal notice regarding overdue civic defect #${data.complaintId} reported in ${data.wardName}.

Complaint Details:
- Reference ID: ${data.complaintId}
- Category: ${data.category.toUpperCase()}
- Location: ${data.addressText || 'Within Ward Jurisdiction'}
- Initial Submission: ${data.submissionDate}
- Statutory SLA Deadline: ${data.slaDeadline}
- Community Reports / Attestations: ${data.weight || 1}

Description of Issue:
${data.description}

The stipulated Service Level Agreement (SLA) for ${data.category} in this ward has lapsed without satisfactory verified resolution. As the field administrator for ${data.wardName}, your urgent dispatch of the designated depot crew is requested immediately.

Kindly confirm initiation of corrective action within 48 hours.

Respectfully,
${complainantName}
${address}
Date: ${today}`;
  }
}

/**
 * Template factory using the Adapter Pattern
 * Matches state, trigger reason, and severity tier
 */
export function getTemplate(
  state: string = 'Maharashtra',
  trigger: string,
  severity?: number,
  manualAuthority?: 'municipal_commissioner' | 'ward_officer' | 'rti'
): EscalationTemplate {
  if (manualAuthority === 'municipal_commissioner') {
    return new GeneralCommissionerTemplate();
  }
  if (manualAuthority === 'ward_officer') {
    return new WardOfficerTemplate();
  }
  if (manualAuthority === 'rti') {
    return new MaharashtraRTITemplate();
  }

  // Trigger-based resolution:
  // Acceptance Check 4: A manual trigger on a verified-failed complaint generates a Commissioner appeal instead of an RTI.
  if (trigger === 'verification_failed' || trigger === 'ghost_closure') {
    return new GeneralCommissionerTemplate();
  }

  // Severe / emergency complaints elevate to Commissioner
  if (typeof severity === 'number' && severity >= 4) {
    return new GeneralCommissionerTemplate();
  }

  // Standard SLA breach defaults to statutory RTI template
  return new MaharashtraRTITemplate();
}
