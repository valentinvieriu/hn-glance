import { defineEventHandler, getRequestURL, setHeader } from 'h3'
import { shouldNoindexApiPath } from '../utils/apiRobots'

export default defineEventHandler((event) => {
  if (shouldNoindexApiPath(getRequestURL(event).pathname)) {
    setHeader(event, 'X-Robots-Tag', 'noindex')
  }
})
