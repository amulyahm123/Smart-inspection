// Base URL of a site's pages, depending on its type
export const sitePath = (site) => `/inspector/${site.type === 'existing' ? 'old-sites' : 'new-sites'}/${site.id}`
export const listPath = (site) => `/inspector/${site.type === 'existing' ? 'old-sites' : 'new-sites'}`
