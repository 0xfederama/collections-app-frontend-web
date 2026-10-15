import type { SelectOption } from '../components/ui'

/** ISO 3166-1 alpha-2 codes. The browser has no API to list regions, so the codes are static; names come from `Intl.DisplayNames`. */
export const COUNTRY_CODES = (
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ ' +
  'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR ' +
  'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP ' +
  'KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT ' +
  'MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW ' +
  'SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG ' +
  'UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'
).split(' ')

/** Used when `Intl.supportedValuesOf('currency')` is missing (old browsers). */
const FALLBACK_CURRENCIES = ['CHF', 'EUR', 'GBP', 'JPY', 'USD']

function displayNames(type: 'region' | 'currency'): Intl.DisplayNames | undefined {
  try {
    return new Intl.DisplayNames(undefined, { type })
  } catch {
    return undefined
  }
}

/** `Italy`, or the bare code when the browser has no name for it. */
function nameOf(names: Intl.DisplayNames | undefined, code: string): string | undefined {
  try {
    const name = names?.of(code)
    return name && name !== code ? name : undefined
  } catch {
    return undefined
  }
}

const byLabel = (a: SelectOption, b: SelectOption) => a.label.localeCompare(b.label)

/** Countries as `Italy (IT)`, sorted by name. A code outside the list (old data) is kept so it still displays. */
export function countryOptions(selected?: string): SelectOption[] {
  const names = displayNames('region')
  const codes =
    selected && !COUNTRY_CODES.includes(selected) ? [selected, ...COUNTRY_CODES] : COUNTRY_CODES
  return codes
    .map((code) => {
      const name = nameOf(names, code)
      return { value: code, label: name ? `${name} (${code})` : code }
    })
    .sort(byLabel)
}

/** Currencies as `EUR · Euro`, sorted by code. A code the browser does not list is kept so it still displays. */
export function currencyOptions(selected?: string): SelectOption[] {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
  let codes: string[]
  try {
    codes = intl.supportedValuesOf?.('currency') ?? FALLBACK_CURRENCIES
  } catch {
    codes = FALLBACK_CURRENCIES
  }
  if (selected && !codes.includes(selected)) codes = [selected, ...codes]
  const names = displayNames('currency')
  return codes.map((code) => {
    const name = nameOf(names, code)
    return { value: code, label: name ? `${code} · ${name}` : code }
  })
}
