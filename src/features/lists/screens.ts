// Heavy route-level components of the lists feature (F020 boundaries). Imported only by src/routes.
// Kept out of index.ts so the shell's eager imports of the barrel don't pull the list screen into
// the main bundle (screens.ts = heavy route-level components, keeps barrels light for code splitting).
export { ListView } from './ListView'
