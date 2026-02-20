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

export const DdsPageContentSchema = v.object({
  version: v.literal(1),
  responsibilitySections: v.array(ResponsibilitySectionSchema),
  checklistBlocks: v.array(ChecklistBlockSchema),
  notes: v.array(v.string()),
})

export type ResponsibilitySection = v.InferOutput<typeof ResponsibilitySectionSchema>
export type ChecklistBlock = v.InferOutput<typeof ChecklistBlockSchema>
export type DdsPageContent = v.InferOutput<typeof DdsPageContentSchema>

export const DEFAULT_DDS_PAGE_CONTENT: DdsPageContent = {
  version: 1,
  responsibilitySections: [
    {
      id: 'core-role',
      title: 'Core DDS Responsibilities',
      items: [
        'DDS is scheduled Monday-to-Monday and owns daily building oversight.',
        'DDS handles morning building opening and maintains secure operations through the day.',
        'DDS holds lockup responsibility until it is properly transferred or executed.',
        'DDS cannot check out while still holding lockup.',
      ],
    },
    {
      id: 'handoff-duty-watch',
      title: 'Tuesday/Thursday Duty Watch Handoff',
      items: [
        'On Tuesday and Thursday, DDS works the day shift and must hand off lockup before leaving.',
        'Duty Watch starts at 1900; SWK or DSWK must take lockup by 1900.',
        'Critical alerts trigger if lockup handoff is missing or required Duty Watch members are absent after 1900.',
      ],
    },
    {
      id: 'transfer-constraints',
      title: 'Lockup Transfer and Execution Constraints',
      items: [
        'Transfer lockup only to qualified and checked-in members.',
        'Lockup execution requires final rounds, secure doors, clear building, and armed alarm.',
        'Tuesday/Thursday lockup time may extend late during events.',
      ],
    },
    {
      id: 'operational-day-audit',
      title: 'Operational Day and Audit Expectations',
      items: [
        'Operational day rolls over at 0300; late-night activity remains part of the previous operational day until rollover.',
        'Manual force checkouts and missed checkouts must be tracked in logs.',
        'Document observations, issues, and deviations in the rounds book/logbook.',
      ],
    },
  ],
  checklistBlocks: [
    {
      id: '0730',
      timeLabel: '0730',
      heading: null,
      tasks: ['Disarm building and open back access door to "access pass".'],
    },
    {
      id: '0730-0755',
      timeLabel: '0730-0755',
      heading: null,
      tasks: [
        'Complete opening rounds including perimeter check.',
        'Check all bay doors are secure.',
        'Confirm previous duty did not leave doors unlocked (weight room, canteen, classrooms, offices, etc.).',
        'Open canteen and weight room.',
        'Turn on lights in flats and drill deck.',
        'Unlock messes.',
        'Pick up garbage, note in duty logbook, and inform CoC.',
        'Winter routine: remove snow from stairs and spread ice pellets on icy patches.',
        'Record observations in logbook.',
      ],
    },
    {
      id: '0800',
      timeLabel: '0800',
      heading: 'Colours',
      tasks: ['Conduct Colours.'],
    },
    {
      id: '0800-1200',
      timeLabel: '0800-1200',
      heading: null,
      tasks: [
        'Record galley refrigerator temperatures (3 refrigerators, 1 freezer).',
        'Mondays: discard leftover food in canteen refrigerator.',
      ],
    },
    {
      id: '1200',
      timeLabel: '1200',
      heading: null,
      tasks: ['Relieve CR person for lunch.', 'Answer phone and door.', 'Accept deliveries.'],
    },
    {
      id: '1600-sunset',
      timeLabel: '1600 (sunset)',
      heading: null,
      tasks: ['Lower and stow ensign.'],
    },
    {
      id: '1600-1630',
      timeLabel: '1600-1630',
      heading: null,
      tasks: [
        'Complete closing rounds including perimeter check.',
        'Ensure accessibility door is locked and access pass door does not open.',
        'Ensure all offices, classrooms, messes, windows, and related spaces are secure.',
        'Ensure galley, weight room, canteen, and boat bay doors are secure.',
        "Ensure gate in Ship's office is pulled down and locked.",
        'Ensure compound gate is locked.',
        'Lock restricted key press.',
        'Enter rounds completion in rounds book.',
        'Activate intruder alarm.',
        'Call MPs to confirm CHW shows armed at 17 Wing ext 2633.',
      ],
    },
  ],
  notes: [
    'Template content is editable by Admin/Developer users. Correct wording in-app if local SOP updates.',
    'Use this page as the operational baseline; always follow current chain-of-command direction.',
  ],
}

function normalizeStringArray(values: string[]): string[] {
  return values.map((value) => value.trim()).filter((value) => value.length > 0)
}

function normalizeDdsPageContent(content: DdsPageContent): DdsPageContent {
  return {
    version: 1,
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
    notes: normalizeStringArray(content.notes),
  }
}

export function parseDdsPageContent(value: unknown): DdsPageContent | null {
  const result = v.safeParse(DdsPageContentSchema, value)
  if (!result.success) {
    return null
  }
  return normalizeDdsPageContent(result.output)
}

export function cloneDdsPageContent(content: DdsPageContent): DdsPageContent {
  return {
    version: 1,
    responsibilitySections: content.responsibilitySections.map((section) => ({
      ...section,
      items: [...section.items],
    })),
    checklistBlocks: content.checklistBlocks.map((block) => ({
      ...block,
      tasks: [...block.tasks],
    })),
    notes: [...content.notes],
  }
}
