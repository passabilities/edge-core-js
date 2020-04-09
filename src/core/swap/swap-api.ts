import { div, gt, lt } from 'biggystring'
import { bridgifyObject } from 'yaob'

import {
  EdgePluginMap,
  EdgeSwapQuote,
  EdgeSwapRequest,
  EdgeSwapRequestOptions,
  errorNames
} from '../../types/types'
import { fuzzyTimeout } from '../../util/promise'
import { ApiInput } from '../root-pixie'

/**
 * Fetch quotes from all plugins, and pick the best one.
 */
export async function fetchSwapQuote(
  ai: ApiInput,
  accountId: string,
  request: EdgeSwapRequest,
  opts: EdgeSwapRequestOptions = {}
): Promise<EdgeSwapQuote> {
  const { preferPluginId, disabled = {}, promoCodes = {} } = opts
  const { log } = ai.props

  const account = ai.props.state.accounts[accountId]
  const { swapSettings, userSettings } = account
  const swapPlugins = ai.props.state.plugins.swap

  // Invoke all the active swap plugins:
  const promises: Array<Promise<EdgeSwapQuote>> = []
  for (const pluginId of Object.keys(swapPlugins)) {
    const { enabled = true } =
      swapSettings[pluginId] != null ? swapSettings[pluginId] : {}

    // Start request:
    if (!enabled || disabled[pluginId]) continue
    promises.push(
      swapPlugins[pluginId].fetchSwapQuote(request, userSettings[pluginId], {
        promoCode: promoCodes[pluginId]
      })
    )
  }
  if (promises.length < 1) throw new Error('No swap providers enabled')

  // Wait for the results, with error handling:
  return fuzzyTimeout(promises, 20000).then(
    quotes => {
      log(
        `${promises.length} swap quotes requested, ${quotes.length} resolved:`,
        ...quotes
      )

      // Find the cheapest price:
      const bestQuote = pickBestQuote(quotes, preferPluginId, promoCodes)

      // Close unused quotes:
      for (const quote of quotes) {
        if (quote !== bestQuote) quote.close().catch(() => undefined)
      }
      return bridgifyObject(bestQuote)
    },
    errors => {
      log(
        `All ${promises.length} swap quotes rejected:`,
        ...errors.map(error => {
          const { name, message } = error
          return { name, message, ...error }
        })
      )

      throw pickBestError(errors)
    }
  )
}

/**
 * Picks the best quote out of the available choices.
 */
function pickBestQuote(
  quotes: EdgeSwapQuote[],
  preferPluginId: string | undefined,
  promoCodes: EdgePluginMap<string>
): EdgeSwapQuote {
  return quotes.reduce((a, b) => {
    // Always return quotes from the preferred provider:
    if (a.pluginId === preferPluginId) return a
    if (b.pluginId === preferPluginId) return b

    // Prioritize providers with active promo codes:
    const aHasPromo = promoCodes[a.pluginId] != null
    const bHasPromo = promoCodes[b.pluginId] != null
    if (aHasPromo && !bHasPromo) return b
    if (!aHasPromo && bHasPromo) return a

    // Prioritize accurate quotes over estimates:
    const { isEstimate: aIsEstimate = true } = a
    const { isEstimate: bIsEstimate = true } = b
    if (aIsEstimate && !bIsEstimate) return b
    if (!aIsEstimate && bIsEstimate) return a

    // Prefer the best rate:
    const aRate = div(a.toNativeAmount, a.fromNativeAmount)
    const bRate = div(b.toNativeAmount, b.fromNativeAmount)
    return gt(bRate, aRate) ? b : a
  })
}

/**
 * Picks the best error out of the available choices.
 */
function pickBestError(errors: any[]): any {
  return errors.reduce((a, b) => {
    // Return the highest-ranked error:
    const diff = rankError(a) - rankError(b)
    if (diff > 0) return a
    if (diff < 0) return b

    // Same ranking, so use amounts to distinguish:
    if (a.name === errorNames.SwapBelowLimitError) {
      return lt(a.nativeMin, b.nativeMin) ? a : b
    }
    if (a.name === errorNames.SwapAboveLimitError) {
      return gt(a.nativeMax, b.nativeMax) ? a : b
    }

    // Otherwise, just pick one:
    return a
  })
}

/**
 * Ranks different error codes by priority.
 */
function rankError(error: any): number {
  if (error == null) return 0
  if (error.name === errorNames.InsufficientFundsError) return 6
  if (error.name === errorNames.PendingFundsError) return 6
  if (error.name === errorNames.SwapBelowLimitError) return 5
  if (error.name === errorNames.SwapAboveLimitError) return 4
  if (error.name === errorNames.SwapPermissionError) return 3
  if (error.name === errorNames.SwapCurrencyError) return 2
  return 1
}
