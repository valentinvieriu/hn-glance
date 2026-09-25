export default createUserActivityHandler({
  errorLogMessage: 'Error fetching user stories:',
  errorStatusMessage: 'Failed to fetch user stories',
  fetchActivity: fetchUserPosts,
  timingDescription: 'Algolia user stories and mapping',
})
