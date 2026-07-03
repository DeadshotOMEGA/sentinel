import type { CreateMemberInput, MemberResponse, UpdateMemberInput } from '@sentinel/contracts'

export interface MemberImportedFormFields {
  employeeNumber?: string | null
  mess?: string | null
  moc?: string | null
  classDetails?: string | null
  homePhone?: string | null
  mobilePhone?: string | null
}

export function toOptionalTrimmedString(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : undefined
}

export function toNullableTrimmedString(value: string | null | undefined): string | null {
  return toOptionalTrimmedString(value) ?? null
}

export function getImportedMemberFormDefaults(
  member: MemberResponse | null | undefined
): Required<Record<keyof MemberImportedFormFields, string>> {
  return {
    employeeNumber: member?.employeeNumber ?? '',
    mess: member?.mess ?? '',
    moc: member?.moc ?? '',
    classDetails: member?.classDetails ?? '',
    homePhone: member?.homePhone ?? '',
    mobilePhone: member?.mobilePhone ?? member?.phoneNumber ?? '',
  }
}

export function hasImportedMemberDetails(member: MemberResponse | null | undefined): boolean {
  if (!member) {
    return false
  }

  return Object.values(getImportedMemberFormDefaults(member)).some(
    (value) => value.trim().length > 0
  )
}

export function buildCreateImportedMemberFields(
  data: MemberImportedFormFields
): Pick<
  CreateMemberInput,
  'employeeNumber' | 'mess' | 'moc' | 'classDetails' | 'homePhone' | 'mobilePhone'
> {
  return {
    employeeNumber: toOptionalTrimmedString(data.employeeNumber),
    mess: toOptionalTrimmedString(data.mess),
    moc: toOptionalTrimmedString(data.moc),
    classDetails: toOptionalTrimmedString(data.classDetails),
    homePhone: toOptionalTrimmedString(data.homePhone),
    mobilePhone: toOptionalTrimmedString(data.mobilePhone),
  }
}

export function buildUpdateImportedMemberFields(
  data: MemberImportedFormFields
): Pick<
  UpdateMemberInput,
  'employeeNumber' | 'mess' | 'moc' | 'classDetails' | 'homePhone' | 'mobilePhone'
> {
  return {
    employeeNumber: toNullableTrimmedString(data.employeeNumber),
    mess: toNullableTrimmedString(data.mess),
    moc: toNullableTrimmedString(data.moc),
    classDetails: toNullableTrimmedString(data.classDetails),
    homePhone: toNullableTrimmedString(data.homePhone),
    mobilePhone: toNullableTrimmedString(data.mobilePhone),
  }
}
