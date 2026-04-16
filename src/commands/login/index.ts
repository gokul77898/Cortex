import type { Command } from '../../commands.js'
import { hasCORTEXApiKeyAuth } from '../../utils/auth.js'
import { isEnvTruthy } from '../../utils/envUtils.js'

export default () =>
  ({
    type: 'local-jsx',
    name: 'login',
    description: hasCORTEXApiKeyAuth()
      ? 'Switch CORTEX accounts'
      : 'Sign in with your CORTEX account',
    isEnabled: () => !isEnvTruthy(process.env.DISABLE_LOGIN_COMMAND),
    load: () => import('./login.js'),
  }) satisfies Command
