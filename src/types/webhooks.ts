/**
 * Resend webhook payload type
 * Based on Resend event schema
 */
export interface ResendWebhookPayload {
  event?: string | null
  message?: {
    id: string
    [key: string]: unknown
  } | null
  id?: string | null
  [key: string]: unknown
}

/**
 * Tag entity for team settings
 */
export interface TagEntity {
  id: string
  name: string
  slug: string
  createdAt: string
}

/**
 * Team metadata containing tags and other settings
 */
export interface TeamMetadata {
  tags?: TagEntity[]
  [key: string]: unknown
}

/**
 * Tags API request payloads
 */
export interface CreateTagPayload {
  teamId?: string | null
  name: string
}

export interface UpdateTagPayload {
  teamId?: string | null
  id: string
  name: string
}

export interface DeleteTagPayload {
  teamId?: string | null
  id: string
}
