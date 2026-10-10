import { existingChecklist } from './checklists'
import { teamByCategory } from './teams'

export const constructionIssueCategories = ['Quality', 'Safety', 'Progress', 'Site Management']
const constructionTeams = { Quality: 'Contractor QA', Safety: 'Contractor Safety', Progress: 'Project Management Unit', 'Site Management': 'Project Management Unit' }

export const categoriesFor = (type) => (type === 'construction' ? constructionIssueCategories : existingChecklist.map((c) => c.name))
export const teamFor = (type, category) => (type === 'construction' ? constructionTeams[category] : teamByCategory[category])
