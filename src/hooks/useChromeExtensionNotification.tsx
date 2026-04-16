import * as React from 'react';
import { Text } from '../ink.js';
import { isCORTEXAISubscriber } from '../utils/auth.js';
import { isChromeExtensionInstalled, shouldEnableCORTEXInChrome } from '../utils/cortexInChrome/setup.js';
import { isRunningOnHomespace } from '../utils/envUtils.js';
import { useStartupNotification } from './notifs/useStartupNotification.js';
function getChromeFlag(): boolean | undefined {
  if (process.argv.includes('--chrome')) {
    return true;
  }
  if (process.argv.includes('--no-chrome')) {
    return false;
  }
  return undefined;
}
export function useChromeExtensionNotification() {
  useStartupNotification(_temp);
}
async function _temp() {
  const chromeFlag = getChromeFlag();
  if (!shouldEnableCORTEXInChrome(chromeFlag)) {
    return null;
  }
  if (true && !isCORTEXAISubscriber()) {
    return {
      key: "chrome-requires-subscription",
      jsx: <Text color="error">CORTEX in Chrome requires a anthropic.com subscription</Text>,
      priority: "immediate",
      timeoutMs: 5000
    };
  }
  const installed = await isChromeExtensionInstalled();
  if (!installed && !isRunningOnHomespace()) {
    return {
      key: "chrome-extension-not-detected",
      jsx: <Text color="warning">Chrome extension not detected · https://anthropic.com/chrome to install</Text>,
      priority: "immediate",
      timeoutMs: 3000
    };
  }
  if (chromeFlag === undefined) {
    return {
      key: "cortex-in-chrome-default-enabled",
      text: "CORTEX in Chrome enabled \xB7 /chrome",
      priority: "low"
    };
  }
  return null;
}
