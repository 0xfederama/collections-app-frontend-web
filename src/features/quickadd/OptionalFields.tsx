import type { KeyboardEvent, RefObject } from 'react'
import { Button, IconButton, TextArea, TextField } from '../../components/ui'
import { ImagePlus, Plus, X } from '../../components/ui/icons'
import { ACCEPT, MAX_CONTENT_BYTES } from '../items'
import type { Field } from './model'

/** The optional website, description and image of Quick add: state and refs stay in the dialog. */
interface OptionalFieldsProps {
  website: string
  setWebsite: (value: string) => void
  websiteRef: RefObject<HTMLInputElement | null>
  showWebsite: boolean
  setShowWebsite: (show: boolean) => void
  description: string
  setDescription: (value: string) => void
  descriptionRef: RefObject<HTMLTextAreaElement | null>
  showDescription: boolean
  setShowDescription: (show: boolean) => void
  onTextAreaKey: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  image: File | undefined
  setImage: (file: File | undefined) => void
  fileRef: RefObject<HTMLInputElement | null>
  chooseRef: RefObject<HTMLButtonElement | null>
  showImage: boolean
  setShowImage: (show: boolean) => void
  errors: Partial<Record<Field, string>>
  dismiss: (key: Field) => void
  reveal: (show: () => void, focus: () => void) => void
}

type RevealProps = Pick<
  OptionalFieldsProps,
  | 'showWebsite'
  | 'setShowWebsite'
  | 'websiteRef'
  | 'showDescription'
  | 'setShowDescription'
  | 'descriptionRef'
  | 'showImage'
  | 'setShowImage'
  | 'chooseRef'
  | 'reveal'
>

/** The "+ Website / + Description / + Image" buttons; each one hides once its field is shown. */
export function RevealButtons({
  showWebsite,
  setShowWebsite,
  websiteRef,
  showDescription,
  setShowDescription,
  descriptionRef,
  showImage,
  setShowImage,
  chooseRef,
  reveal,
}: RevealProps) {
  return (
    <>
      {!showWebsite && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            reveal(
              () => setShowWebsite(true),
              () => websiteRef.current?.focus(),
            )
          }
        >
          <Plus aria-hidden className="size-4" />
          Website
        </Button>
      )}
      {!showDescription && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            reveal(
              () => setShowDescription(true),
              () => descriptionRef.current?.focus(),
            )
          }
        >
          <Plus aria-hidden className="size-4" />
          Description
        </Button>
      )}
      {!showImage && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            reveal(
              () => setShowImage(true),
              () => chooseRef.current?.focus(),
            )
          }
        >
          <Plus aria-hidden className="size-4" />
          Image
        </Button>
      )}
    </>
  )
}

type SectionProps = Pick<
  OptionalFieldsProps,
  | 'website'
  | 'setWebsite'
  | 'websiteRef'
  | 'showWebsite'
  | 'description'
  | 'setDescription'
  | 'descriptionRef'
  | 'showDescription'
  | 'onTextAreaKey'
  | 'image'
  | 'setImage'
  | 'fileRef'
  | 'chooseRef'
  | 'showImage'
  | 'errors'
  | 'dismiss'
>

/** The revealed website, description and image fields, below the picker row. */
export function OptionalSections({
  website,
  setWebsite,
  websiteRef,
  showWebsite,
  description,
  setDescription,
  descriptionRef,
  showDescription,
  onTextAreaKey,
  image,
  setImage,
  fileRef,
  chooseRef,
  showImage,
  errors,
  dismiss,
}: SectionProps) {
  return (
    <>
      {showWebsite && (
        <div className="[&_label]:sr-only">
          <TextField
            ref={websiteRef}
            label="Website"
            inputMode="url"
            autoComplete="off"
            placeholder="https://"
            value={website}
            onChange={(event) => {
              setWebsite(event.target.value)
              dismiss('website')
            }}
            error={errors.website}
          />
        </div>
      )}
      {showDescription && (
        <div className="[&_label]:sr-only">
          <TextArea
            ref={descriptionRef}
            label="Description"
            hint="Markdown. Ctrl+Enter or Cmd+Enter adds."
            placeholder="Write in Markdown…"
            rows={3}
            value={description}
            onChange={(event) => {
              setDescription(event.target.value)
              dismiss('description')
            }}
            onKeyDown={onTextAreaKey}
            error={errors.description}
            maxLength={MAX_CONTENT_BYTES}
          />
        </div>
      )}
      {showImage && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              tabIndex={-1}
              aria-hidden
              className="sr-only"
              onChange={(event) => {
                setImage(event.target.files?.[0])
                dismiss('image')
              }}
            />
            <Button
              ref={chooseRef}
              variant="secondary"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus aria-hidden className="size-4" />
              {image ? 'Change image' : 'Choose image'}
            </Button>
            {image && (
              <>
                <span className="min-w-0 flex-1 truncate text-ui text-text-muted">
                  {image.name}
                </span>
                <IconButton
                  aria-label="Remove image"
                  className="size-8 pointer-coarse:size-11"
                  onClick={() => {
                    setImage(undefined)
                    if (fileRef.current) fileRef.current.value = ''
                  }}
                >
                  <X aria-hidden />
                </IconButton>
              </>
            )}
          </div>
          {errors.image && (
            <p role="alert" className="text-secondary font-medium text-danger-text">
              {errors.image}
            </p>
          )}
        </div>
      )}
    </>
  )
}
