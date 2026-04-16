import { formatTotalCost } from '../../cost-tracker.js'
import { currentLimits } from '../../services/cortexAiLimits.js'
import type { LocalCommandCall } from '../../types/command.js'
import { isCORTEXAISubscriber } from '../../utils/auth.js'

export const call: LocalCommandCall = async () => {
  if (isCORTEXAISubscriber()) {
    let value: string

    if (currentLimits.isUsingOverage) {
      value =
        'You are currently using your overages to power your CORTEX usage. We will automatically switch you back to your subscription rate limits when they reset'
    } else {
      value =
        'You are currently using your subscription to power your CORTEX usage'
    }

    if (process.env.USER_TYPE === 'ant') {
      value += `\n\n[internal-only] Showing cost anyway:\n ${formatTotalCost()}`
    }
    return { type: 'text', value }
  }
  return { type: 'text', value: formatTotalCost() }
}
