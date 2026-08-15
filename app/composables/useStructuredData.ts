import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import {
  serializeStructuredData,
  type StructuredData,
} from '#shared/utils/structuredData'

export const useStructuredData = (
  key: string,
  value: MaybeRefOrGetter<StructuredData | null>,
) => {
  useHead(() => {
    const data = toValue(value)

    return {
      script: data
        ? [{
            key: `structured-data:${key}`,
            type: 'application/ld+json',
            innerHTML: serializeStructuredData(data),
          }]
        : [],
    }
  })
}
