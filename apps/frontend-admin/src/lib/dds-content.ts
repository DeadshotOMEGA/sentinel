import * as v from 'valibot'

export const DDS_TEMPLATE_SETTING_KEY = 'dds.page.content.v1'
export const DDS_TEMPLATE_SETTING_CATEGORY = 'app_config'
export const DDS_TEMPLATE_SETTING_DESCRIPTION = 'Editable DDS operations page template content'

export const ResponsibilitySectionSchema = v.object({
  id: v.string(),
  title: v.string(),
  items: v.array(v.string()),
})

export const ChecklistBlockSchema = v.object({
  id: v.string(),
  timeLabel: v.string(),
  heading: v.nullable(v.string()),
  tasks: v.array(v.string()),
})

export const QuickContactSchema = v.object({
  id: v.string(),
  label: v.string(),
  phone: v.string(),
  notes: v.nullable(v.string()),
})

export const DutyPhoneProtocolSectionSchema = v.object({
  id: v.string(),
  title: v.string(),
  items: v.array(v.string()),
})

export const MemberCallScenarioSchema = v.object({
  id: v.string(),
  scenario: v.string(),
  guidance: v.array(v.string()),
})

export const PhoneLogRequirementSchema = v.object({
  id: v.string(),
  title: v.string(),
  items: v.array(v.string()),
})

export const ReferenceDownloadSchema = v.object({
  id: v.string(),
  title: v.string(),
  href: v.string(),
  fileType: v.picklist(['pdf', 'docx']),
  description: v.nullable(v.string()),
})

export const DdsPageContentSchema = v.object({
  version: v.literal(2),
  responsibilitySections: v.array(ResponsibilitySectionSchema),
  checklistBlocks: v.array(ChecklistBlockSchema),
  quickContacts: v.array(QuickContactSchema),
  dutyPhoneProtocol: v.array(DutyPhoneProtocolSectionSchema),
  memberCallScenarios: v.array(MemberCallScenarioSchema),
  phoneLogRequirements: v.array(PhoneLogRequirementSchema),
  referenceDownloads: v.array(ReferenceDownloadSchema),
  notes: v.array(v.string()),
})

export type ResponsibilitySection = v.InferOutput<typeof ResponsibilitySectionSchema>
export type ChecklistBlock = v.InferOutput<typeof ChecklistBlockSchema>
export type QuickContact = v.InferOutput<typeof QuickContactSchema>
export type DutyPhoneProtocolSection = v.InferOutput<typeof DutyPhoneProtocolSectionSchema>
export type MemberCallScenario = v.InferOutput<typeof MemberCallScenarioSchema>
export type PhoneLogRequirement = v.InferOutput<typeof PhoneLogRequirementSchema>
export type ReferenceDownload = v.InferOutput<typeof ReferenceDownloadSchema>
export type DdsPageContent = v.InferOutput<typeof DdsPageContentSchema>

export const DEFAULT_DDS_PAGE_CONTENT: DdsPageContent = {
  version: 2,
  responsibilitySections: [
    {
      id: 'core-role',
      title: 'Core DDS Responsibilities',
      items: [
        'Follow the Duty Day SOP checklist at the start of shift and sign the rounds/log book.',
        'Duty phone instructions are mandatory and must be followed for every call and callback.',
        'DDS holds lockup responsibility until it is properly transferred or executed.',
        'DDS cannot check out while still holding lockup.',
      ],
    },
    {
      id: 'availability-standard',
      title: 'On-Call Availability and Movement',
      items: [
        'Duty personnel are on call/standby throughout duty and keep the duty phone nearby.',
        'Be ready to respond to any call within 30 minutes while on duty.',
        'Remain within the authorized 30-minute geographical boundary unless explicitly approved otherwise.',
      ],
    },
    {
      id: 'conduct-rules',
      title: 'Dress and Conduct',
      items: [
        'Wear the dress of the day while on duty and maintain professional conduct.',
        'Do not consume intoxicants within 8 hours before duty or during duty.',
        'Document issues, deviations, and actions taken in the duty records.',
      ],
    },
    {
      id: 'handoff-duty-watch',
      title: 'Duty Watch Handoff Expectations',
      items: [
        'On Tuesday and Thursday, DDS works day shift and hands off lockup before leaving.',
        'Duty Watch starts at 1900; SWK or DSWK must take lockup by 1900.',
        'Escalate immediately if handoff is delayed or required watch members are absent.',
      ],
    },
  ],
  checklistBlocks: [
    {
      id: '0730',
      timeLabel: '0730',
      heading: null,
      tasks: [
        'Disarm building and set back access door to "access pass".',
        'Turn on all lights and begin opening rounds.',
      ],
    },
    {
      id: 'opening-first-floor',
      timeLabel: 'Opening Rounds',
      heading: 'First Floor',
      tasks: [
        'Prop/open both glass double doors at 0800.',
        'Open or secure rooms per SOP: 116 (Brow), 141, 118B, command flats, 128A+B, 133, 109A, 112A.',
        'Ensure POL Stores/Paint Locker fan remains on (158/159).',
        'Set compound access door (137) to pass key and turn on light.',
      ],
    },
    {
      id: 'opening-second-floor',
      timeLabel: 'Opening Rounds',
      heading: 'Second Floor and Compound',
      tasks: [
        'Unlock 207, 201A, 210, 232A, and confirm 215 is unlocked.',
        'Open compound gate and ensure lock is secured on the gate.',
        'Record opening rounds completion and notable observations in the log book.',
      ],
    },
    {
      id: '0800',
      timeLabel: '0800',
      heading: 'Colours',
      tasks: ['Conduct Colours.'],
    },
    {
      id: 'daytime-routine',
      timeLabel: '0800-1600',
      heading: null,
      tasks: [
        'Answer duty phone and door; action all calls according to duty phone protocol.',
        'Record galley refrigerator temperatures (3 fridges, 1 freezer).',
        'Mondays: discard leftover food in canteen refrigerator.',
        'Fridays: empty fridge contents as directed.',
      ],
    },
    {
      id: 'sunset',
      timeLabel: 'Sunset',
      heading: null,
      tasks: ['Lower and stow ensign (1600 standard / 1500 modified summer hours).'],
    },
    {
      id: 'closing-first-floor',
      timeLabel: 'Closing Rounds',
      heading: 'First Floor',
      tasks: [
        'Turn off lights and check all handles/doors are secure.',
        'Close/secure glass doors, 116, 141, 118B, command flats, 128A+B, 133, 109A, and 112A.',
        'Ensure fridges/dishwasher/coffee makers are off; boat bay doors latched.',
        'Confirm side compound access door is locked and band room exit is fully latched.',
        'Keep POL Stores/Paint Locker fan on (158/159).',
      ],
    },
    {
      id: 'closing-second-floor',
      timeLabel: 'Closing Rounds',
      heading: 'Second Floor and Final Security',
      tasks: [
        'Lock 207, 201A, 210, and 215; close 232A without locking.',
        'Lock compound gate, walk perimeter, and verify external security.',
        'Activate intruder alarm and call MPs to confirm CHW shows armed.',
        'Record rounds completion in rounds/log book.',
      ],
    },
  ],
  quickContacts: [
    {
      id: 'duty-phone',
      label: 'Duty Phone',
      phone: '204-612-4621',
      notes: 'Voicemail password: 4621',
    },
    {
      id: 'wing-mps',
      label: '17 Wing MPs',
      phone: '204-833-2500 ext 2572633',
      notes: 'Use for missed calls with unknown caller ID or alarm checks.',
    },
    {
      id: 'wing-ops',
      label: '17 Wing Ops Center',
      phone: '<update required>',
      notes: 'Confirm correct line with chain of command.',
    },
    {
      id: 'hr-manager',
      label: 'HR Manager',
      phone: '<update required>',
      notes: 'Travel and administrative escalation point.',
    },
    {
      id: 'last-resort',
      label: 'Last Resort: MS Voth',
      phone: '204-619-2979',
      notes: 'Use only when normal escalation channels do not resolve the issue.',
    },
  ],
  dutyPhoneProtocol: [
    {
      id: 'missed-calls',
      title: 'Missed Calls',
      items: [
        'If a duty phone call is missed, check voicemail immediately at 204-612-4621 (password 4621).',
        'If no voicemail exists and caller ID is available, return the call as soon as possible.',
        'If no voicemail and caller ID is unavailable, contact 17 Wing MPs to verify alarm status.',
        'Record every call in the duty phone log, including callback delay and reason.',
      ],
    },
    {
      id: 'call-types',
      title: 'Nature of Calls and Required Action',
      items: [
        'Alarm-related: action immediately according to duty procedures.',
        'Temporary duty travel/facility issues: contact HR Manager or Facilities Manager as applicable.',
        'Emergency: contact XO and/or COXN and capture all incident details.',
        'Priority messages: follow COM CENTER directions and coordinate pickup when directed.',
      ],
    },
    {
      id: 'sop-signoff',
      title: 'SOP Compliance and Sign-Off',
      items: [
        'Read SOP checklist and duty phone instructions at the start of duty.',
        'Acknowledge start-of-duty sign-off in the HMCS CHIPPAWA duty rounds/log book.',
        'Keep SOP checklist and logs in the duty binder for audit visibility.',
      ],
    },
  ],
  memberCallScenarios: [
    {
      id: 'late-missed-flight',
      scenario: 'Late or Missed Flight',
      guidance: [
        'Member must coordinate rebooking directly with airline customer service.',
        'Change fees are reimbursable only for emergency circumstances determined on return.',
        'If no flight is available, member waits for next flight at hotel/home per reimbursement policy.',
      ],
    },
    {
      id: 'cancelled-flight',
      scenario: 'Cancelled Flight',
      guidance: [
        'Airline normally rebooks onto next available flight; member should confirm rebooking.',
        'Overnight costs are airline-covered for plane malfunction cases.',
        'Weather-delay overnight costs are reimbursed by unit policy.',
      ],
    },
    {
      id: 'baggage',
      scenario: 'Baggage Issues',
      guidance: [
        'Extra checked bag is reimbursed only when authorized in joining instructions.',
        'Lost baggage claims can be filed under DAOD 7004-2 on return.',
        'Member still reports for duty in appropriate attire and informs OPI.',
      ],
    },
    {
      id: 'accommodations',
      scenario: 'Accommodation Not Booked',
      guidance: [
        'Member should present confirmation email from the travel package.',
        'If still unresolved, escalate to HR Manager point of contact.',
      ],
    },
    {
      id: 'travel-package',
      scenario: 'Missing Travel Package',
      guidance: [
        'Ensure member has all travel and accommodation information before departure.',
        'Email route letter so pay can be activated.',
        'Inform TRG/SHO so new chain of command is aware of delays.',
      ],
    },
  ],
  phoneLogRequirements: [
    {
      id: 'identity',
      title: 'Capture Caller and Time',
      items: [
        'Record date, time, caller identity, and organization/unit.',
        'Mark call category (facility, emergency, travel, alarm, or other).',
      ],
    },
    {
      id: 'report',
      title: 'Record 5Ws and Action',
      items: [
        'Include who, what, where, when, why, and how.',
        'Document the action taken and callback timing if applicable.',
      ],
    },
    {
      id: 'signoff',
      title: 'Duty Log Sign-Off',
      items: [
        'Each completed phone log entry includes DDS name and signature.',
        'Store completed logs in the duty binder with rounds records.',
      ],
    },
  ],
  referenceDownloads: [
    {
      id: 'checklist-annexes',
      title: 'COTM 19/25 Checklist for Duty Day Staff',
      href: '/assets/dds/cotm-19-25-checklist-for-duty-day-staff.pdf',
      fileType: 'pdf',
      description:
        'Primary SOP memo and annexes: checklist, duty phone instructions, and 30-minute boundary map.',
    },
    {
      id: 'duty-binder',
      title: 'Duty Binder',
      href: '/assets/dds/duty-binder.docx',
      fileType: 'docx',
      description: 'Room-by-room opening and closing checklist source.',
    },
    {
      id: 'dds-phone-log',
      title: 'DDS Phone Log',
      href: '/assets/dds/dds-phone-log.docx',
      fileType: 'docx',
      description: 'Duty phone report template with mandatory call capture fields.',
    },
    {
      id: 'member-call-guide',
      title: 'When a Member Calls',
      href: '/assets/dds/when-a-member-calls.docx',
      fileType: 'docx',
      description: 'Member travel disruption triage and escalation guidance.',
    },
    {
      id: 'ship-map-first-floor',
      title: 'CHW Know Your Ship - 1st Floor',
      href: '/assets/dds/chw-know-your-ship-1st-floor.pdf',
      fileType: 'pdf',
      description: 'First-floor exits, fire routes, and safety-equipment legend.',
    },
    {
      id: 'ship-map-second-floor',
      title: 'CHW Know Your Ship - 2nd Floor',
      href: '/assets/dds/chw-know-your-ship-2nd-floor.pdf',
      fileType: 'pdf',
      description: 'Second-floor fire escape routes.',
    },
  ],
  notes: [
    'Template content is editable by Admin/Developer users. Update wording and contact details in-app as SOP changes.',
    'Use this page as the operational baseline; always follow current chain-of-command direction.',
  ],
}

const LegacyDdsPageContentSchema = v.object({
  version: v.literal(1),
  responsibilitySections: v.array(ResponsibilitySectionSchema),
  checklistBlocks: v.array(ChecklistBlockSchema),
  notes: v.array(v.string()),
})

type LegacyDdsPageContent = v.InferOutput<typeof LegacyDdsPageContentSchema>

function normalizeStringArray(values: string[]): string[] {
  return values.map((value) => value.trim()).filter((value) => value.length > 0)
}

function normalizeNullableString(value: string | null): string | null {
  if (value === null) return null
  const next = value.trim()
  return next.length > 0 ? next : null
}

function normalizeDdsPageContent(content: DdsPageContent): DdsPageContent {
  return {
    version: 2,
    responsibilitySections: content.responsibilitySections.map((section) => ({
      ...section,
      title: section.title.trim(),
      items: normalizeStringArray(section.items),
    })),
    checklistBlocks: content.checklistBlocks.map((block) => ({
      ...block,
      timeLabel: block.timeLabel.trim(),
      heading: block.heading?.trim() ? block.heading.trim() : null,
      tasks: normalizeStringArray(block.tasks),
    })),
    quickContacts: content.quickContacts.map((contact) => ({
      ...contact,
      label: contact.label.trim(),
      phone: contact.phone.trim(),
      notes: normalizeNullableString(contact.notes),
    })),
    dutyPhoneProtocol: content.dutyPhoneProtocol.map((section) => ({
      ...section,
      title: section.title.trim(),
      items: normalizeStringArray(section.items),
    })),
    memberCallScenarios: content.memberCallScenarios.map((scenario) => ({
      ...scenario,
      scenario: scenario.scenario.trim(),
      guidance: normalizeStringArray(scenario.guidance),
    })),
    phoneLogRequirements: content.phoneLogRequirements.map((requirement) => ({
      ...requirement,
      title: requirement.title.trim(),
      items: normalizeStringArray(requirement.items),
    })),
    referenceDownloads: content.referenceDownloads.map((download) => ({
      ...download,
      title: download.title.trim(),
      href: download.href.trim(),
      description: normalizeNullableString(download.description),
    })),
    notes: normalizeStringArray(content.notes),
  }
}

function migrateLegacyToV2(content: LegacyDdsPageContent): DdsPageContent {
  return normalizeDdsPageContent({
    version: 2,
    responsibilitySections: content.responsibilitySections,
    checklistBlocks: content.checklistBlocks,
    quickContacts: cloneDdsPageContent(DEFAULT_DDS_PAGE_CONTENT).quickContacts,
    dutyPhoneProtocol: cloneDdsPageContent(DEFAULT_DDS_PAGE_CONTENT).dutyPhoneProtocol,
    memberCallScenarios: cloneDdsPageContent(DEFAULT_DDS_PAGE_CONTENT).memberCallScenarios,
    phoneLogRequirements: cloneDdsPageContent(DEFAULT_DDS_PAGE_CONTENT).phoneLogRequirements,
    referenceDownloads: cloneDdsPageContent(DEFAULT_DDS_PAGE_CONTENT).referenceDownloads,
    notes: content.notes,
  })
}

export function parseDdsPageContent(value: unknown): DdsPageContent | null {
  const result = v.safeParse(DdsPageContentSchema, value)
  if (!result.success) {
    const legacyResult = v.safeParse(LegacyDdsPageContentSchema, value)
    if (!legacyResult.success) {
      return null
    }

    return migrateLegacyToV2(legacyResult.output)
  }
  return normalizeDdsPageContent(result.output)
}

export function cloneDdsPageContent(content: DdsPageContent): DdsPageContent {
  return {
    version: 2,
    responsibilitySections: content.responsibilitySections.map((section) => ({
      ...section,
      items: [...section.items],
    })),
    checklistBlocks: content.checklistBlocks.map((block) => ({
      ...block,
      tasks: [...block.tasks],
    })),
    quickContacts: content.quickContacts.map((contact) => ({ ...contact })),
    dutyPhoneProtocol: content.dutyPhoneProtocol.map((section) => ({
      ...section,
      items: [...section.items],
    })),
    memberCallScenarios: content.memberCallScenarios.map((scenario) => ({
      ...scenario,
      guidance: [...scenario.guidance],
    })),
    phoneLogRequirements: content.phoneLogRequirements.map((requirement) => ({
      ...requirement,
      items: [...requirement.items],
    })),
    referenceDownloads: content.referenceDownloads.map((download) => ({ ...download })),
    notes: [...content.notes],
  }
}
