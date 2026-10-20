// Public face of the settings feature (F020 boundaries): code outside features/settings imports only from here.
// The panes (AboutSection, AppearanceSection, ConnectionSection, SettingsForm, TypesFieldsPane) are not
// re-exported: SettingsRoute lazy-loads them, because the items and shell chunks import this barrel
// and a re-export would pull the panes and their dependencies into those chunks.
export { settingsKeys, useSettings, useTypes, useWorkspaceName } from './api'
export type { TypeDefinition, TypeField } from './api'
export type { SettingsCloseRequestRef } from './SettingsForm'
