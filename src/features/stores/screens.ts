// Heavy entry of the stores feature (F020 boundaries). The store picker imports ServiceIcon (logos), so it stays
// out of index.ts: the settings and list chunks import the barrel and must not load the logos. Imported by the
// lazy item editor (items/inline/StreamingInputs.tsx) and by src/routes only.
export { StoreChoices } from './StoreChoices'
