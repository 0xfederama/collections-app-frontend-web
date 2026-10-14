import { useState, type Ref } from 'react'
import { useNavigate } from 'react-router'
import { TextField } from '../../components/ui'
import { Search } from '../../components/ui/icons'

/** Global search field of the sidebar. Enter opens `/search?q=`; W-11 adds the result dropdown. */
export function SidebarSearch({ inputRef }: { inputRef?: Ref<HTMLInputElement> }) {
  const [value, setValue] = useState('')
  const navigate = useNavigate()

  return (
    <form
      role="search"
      className="[&_label]:sr-only"
      onSubmit={(event) => {
        event.preventDefault()
        const q = value.trim()
        if (q) void navigate(`/search?q=${encodeURIComponent(q)}`)
      }}
    >
      <TextField
        ref={inputRef}
        label="Search"
        type="search"
        placeholder="Search"
        autoComplete="off"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        prefix={<Search aria-hidden className="size-4" />}
        suffix={
          <kbd aria-hidden className="rounded-sm border border-border px-1.5 text-xs">
            /
          </kbd>
        }
      />
    </form>
  )
}
