'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import {
  DEFAULT_DDS_PAGE_CONTENT,
  DDS_TEMPLATE_SETTING_CATEGORY,
  DDS_TEMPLATE_SETTING_DESCRIPTION,
  DDS_TEMPLATE_SETTING_KEY,
  cloneDdsPageContent,
  parseDdsPageContent,
  type DdsPageContent,
} from '@/lib/dds-content'

const ddsTemplateQueryKey = ['dds-page-template'] as const

type TemplateSource = 'remote' | 'default' | 'invalid-fallback'

export interface DdsPageTemplateState {
  content: DdsPageContent
  source: TemplateSource
  updatedAt: string | null
}

function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = body.message
    if (typeof message === 'string' && message.trim().length > 0) {
      return message
    }
  }
  return fallback
}

async function fetchTemplate(): Promise<DdsPageTemplateState> {
  const response = await apiClient.settings.getSettingByKey({
    params: { key: DDS_TEMPLATE_SETTING_KEY },
  })

  if (response.status === 200) {
    const parsed = parseDdsPageContent(response.body.value)
    if (parsed) {
      return {
        content: parsed,
        source: 'remote',
        updatedAt: response.body.updatedAt,
      }
    }

    return {
      content: cloneDdsPageContent(DEFAULT_DDS_PAGE_CONTENT),
      source: 'invalid-fallback',
      updatedAt: response.body.updatedAt,
    }
  }

  if (response.status === 404) {
    return {
      content: cloneDdsPageContent(DEFAULT_DDS_PAGE_CONTENT),
      source: 'default',
      updatedAt: null,
    }
  }

  throw new Error(extractErrorMessage(response.body, 'Failed to load DDS template'))
}

async function upsertTemplate(content: DdsPageContent): Promise<DdsPageTemplateState> {
  const sanitized = parseDdsPageContent(content)
  if (!sanitized) {
    throw new Error('DDS template payload is invalid')
  }

  const existing = await apiClient.settings.getSettingByKey({
    params: { key: DDS_TEMPLATE_SETTING_KEY },
  })

  if (existing.status === 200) {
    const updated = await apiClient.settings.updateSetting({
      params: { key: DDS_TEMPLATE_SETTING_KEY },
      body: {
        value: sanitized,
        description: DDS_TEMPLATE_SETTING_DESCRIPTION,
      },
    })

    if (updated.status !== 200) {
      throw new Error(extractErrorMessage(updated.body, 'Failed to update DDS template'))
    }

    const parsed = parseDdsPageContent(updated.body.value)
    if (!parsed) {
      throw new Error('Updated DDS template could not be validated')
    }

    return {
      content: parsed,
      source: 'remote',
      updatedAt: updated.body.updatedAt,
    }
  }

  if (existing.status === 404) {
    const created = await apiClient.settings.createSetting({
      body: {
        key: DDS_TEMPLATE_SETTING_KEY,
        value: sanitized,
        category: DDS_TEMPLATE_SETTING_CATEGORY,
        description: DDS_TEMPLATE_SETTING_DESCRIPTION,
      },
    })

    if (created.status !== 201) {
      throw new Error(extractErrorMessage(created.body, 'Failed to create DDS template'))
    }

    const parsed = parseDdsPageContent(created.body.value)
    if (!parsed) {
      throw new Error('Created DDS template could not be validated')
    }

    return {
      content: parsed,
      source: 'remote',
      updatedAt: created.body.updatedAt,
    }
  }

  throw new Error(extractErrorMessage(existing.body, 'Failed to resolve DDS template setting'))
}

export function useDdsPageContent() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ddsTemplateQueryKey,
    queryFn: fetchTemplate,
  })

  const saveTemplateMutation = useMutation({
    mutationFn: upsertTemplate,
    onSuccess: (data) => {
      queryClient.setQueryData(ddsTemplateQueryKey, data)
    },
  })

  return {
    ...query,
    saveTemplateMutation,
  }
}
