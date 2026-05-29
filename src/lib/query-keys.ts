export const athleteKeys = {
  all: ['athletes'] as const,
  lists: () => [...athleteKeys.all, 'list'] as const,
  list: (filters: Record<string, string | undefined>) => [...athleteKeys.lists(), filters] as const,
  details: () => [...athleteKeys.all, 'detail'] as const,
  detail: (id: string) => [...athleteKeys.details(), id] as const,
  me: () => [...athleteKeys.all, 'me'] as const,
}

export const checkInKeys = {
  all: ['check-ins'] as const,
  list: (athleteId?: string) => [...checkInKeys.all, 'list', { athleteId }] as const,
}

export const dailyLogKeys = {
  all: ['daily-logs'] as const,
  list: (athleteId?: string) => [...dailyLogKeys.all, 'list', { athleteId }] as const,
}

export const trainingPlanKeys = {
  all: ['training-plans'] as const,
  list: (athleteId?: string) => [...trainingPlanKeys.all, 'list', { athleteId }] as const,
  detail: (id: string) => [...trainingPlanKeys.all, 'detail', id] as const,
}

export const sessionLogKeys = {
  all: ['session-logs'] as const,
  list: (athleteId?: string) => [...sessionLogKeys.all, 'list', { athleteId }] as const,
}

export const nutritionPlanKeys = {
  all: ['nutrition-plans'] as const,
  list: (athleteId?: string) => [...nutritionPlanKeys.all, 'list', { athleteId }] as const,
  detail: (id: string) => [...nutritionPlanKeys.all, 'detail', id] as const,
}

export const servicePlanKeys = {
  all: ['service-plans'] as const,
  list: () => [...servicePlanKeys.all, 'list'] as const,
}

export const coachKeys = {
  all: ['coach'] as const,
  me: () => [...coachKeys.all, 'me'] as const,
}

export const documentKeys = {
  all: ['documents'] as const,
  list: (athleteId?: string) => [...documentKeys.all, 'list', { athleteId }] as const,
}

export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
}

export const teamKeys = {
  all: ['team'] as const,
  catalog: () => [...teamKeys.all, 'catalog'] as const,
}

export const coachTodayKeys = {
  all: ['coach-today'] as const,
  summary: () => [...coachTodayKeys.all, 'summary'] as const,
}
