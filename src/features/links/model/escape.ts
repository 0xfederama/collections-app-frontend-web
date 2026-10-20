// Same output as Go's url.QueryEscape: encodeURIComponent, but the characters it
// leaves bare (! ' ( ) *) are escaped too, and a space is '+'. "~" stays as is.
export function queryEscape(value: string): string {
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, '+')
}
