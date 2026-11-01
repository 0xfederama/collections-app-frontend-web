// Heavy route-level components of the settings feature (F020 boundaries). Imported only by src/routes.
// Kept out of index.ts so the shell's and items' eager imports of the barrel don't pull the panes
// into their chunks (screens.ts = heavy route-level components, keeps barrels light for code splitting).
export { AboutSection } from './AboutSection'
export { AppearanceSection } from './AppearanceSection'
export { ConnectionSection } from './ConnectionSection'
export { SettingsForm } from './SettingsForm'
