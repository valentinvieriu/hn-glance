export default defineEventHandler((event) => {
  if (shouldNoindexApiPath(getRequestURL(event).pathname)) {
    setHeader(event, 'X-Robots-Tag', 'noindex')
  }
})
