import { Select } from '../../components/ui'
import { CountrySelect } from '../../components/ui/IsoSelects'
import { OwnedServicesField } from './OwnedServicesField'
import {
  inputId,
  metadataLanguageOptions,
  type ErrorMap,
  type SettingsDraft,
  type ScalarSettingsField,
} from './form'

/** The Media pane: country, owned streaming services, metadata language and the default book store. */
export function MediaFields({
  hidden,
  draft,
  errors,
  isPending,
  set,
  setOwned,
  providers,
}: {
  hidden: boolean
  draft: SettingsDraft
  errors: ErrorMap
  isPending: boolean
  set: (field: ScalarSettingsField, value: string) => void
  /** F-022-W3: replaces the owned streaming services (provider keys). */
  setOwned: (keys: string[]) => void
  /** The store providers, from `useStoreProviders()`; `[]` while loading. */
  providers: readonly { key: string; name: string }[]
}) {
  return (
    <section
      aria-labelledby="settings-movies-tv"
      hidden={hidden}
      className={`flex flex-col gap-4 ${hidden ? 'hidden' : ''}`}
    >
      <h2 id="settings-movies-tv" className="font-display text-section text-text">
        Country &amp; language
      </h2>
      <CountrySelect
        id={inputId('streaming_country_code')}
        label="Country"
        hint="Streaming platforms on a movie or TV show, and the book store links (Amazon and others), are for this country."
        placeholder="Country"
        value={draft.streaming_country_code}
        onValueChange={(value) => set('streaming_country_code', value)}
        error={errors.streaming_country_code}
      />
      <OwnedServicesField
        value={draft.owned_streaming_services}
        onChange={setOwned}
        error={errors.owned_streaming_services}
        disabled={isPending}
      />
      <Select
        id={inputId('metadata_language')}
        label="Metadata language"
        hint="Titles and other details filled from online sources use this language."
        value={draft.metadata_language}
        onValueChange={(value) => set('metadata_language', value)}
        error={errors.metadata_language}
        disabled={isPending}
        options={metadataLanguageOptions}
      />
      <h2 id="settings-books" className="pt-2 font-display text-section text-text">
        Books
      </h2>
      <Select
        id={inputId('preferred_store')}
        label="Default store"
        hint="New books start with this store. Each book can pick other stores. Store links are for your country."
        value={draft.preferred_store}
        onValueChange={(value) => set('preferred_store', value)}
        error={errors.preferred_store}
        disabled={isPending}
        options={providers.map((provider) => ({ value: provider.key, label: provider.name }))}
      />
    </section>
  )
}
