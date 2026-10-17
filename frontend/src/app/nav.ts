import {
  Activity,
  BookOpen,
  CloudUpload,
  FlaskConical,
  Grid3x3,
  LayoutDashboard,
  Package,
  Route,
  ShieldAlert,
  SlidersHorizontal,
  Undo2,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  path: string
  label: string
  icon: LucideIcon
  description: string
  soon?: boolean
}

export const PRIMARY_NAV: NavItem[] = [
  { path: '/data-source', label: 'Data Source', icon: CloudUpload, description: 'Upload or pick a retail dataset to analyse.' },
  { path: '/overview', label: 'Overview', icon: LayoutDashboard, description: 'Headline KPIs, sales, segments and leakage.' },
  { path: '/journey', label: 'Customer Journey', icon: Route, description: 'First purchase to repeat - how customers progress over time.' },
  { path: '/segments', label: 'Segments', icon: Users, description: 'RFM segments with size, value and return behaviour.' },
  { path: '/cohorts', label: 'Cohorts', icon: Grid3x3, description: 'Monthly acquisition cohorts and revenue retention.' },
  { path: '/returns', label: 'Returns', icon: Undo2, description: 'Return rates by product, segment and month.' },
  { path: '/products', label: 'Products', icon: Package, description: 'Top products by net revenue and return leakage.' },
  { path: '/anomalies', label: 'Anomalies', icon: Activity, description: 'Days that break the standard-deviation threshold.' },
  { path: '/risk', label: 'Risk Score', icon: ShieldAlert, description: 'Customers ranked by RFM decay and return velocity.' },
  { path: '/simulator', label: 'What-If', icon: SlidersHorizontal, description: 'Simulate retention and return scenarios.' },
]

export const SECONDARY_NAV: NavItem[] = [
  { path: '/pipeline', label: 'Pipeline', icon: Workflow, description: 'The 12-stage cleaning pipeline, step by step.' },
  { path: '/methodology', label: 'Methodology', icon: BookOpen, description: 'How every metric is calculated - no black-box ML.' },
  { path: '/ml-lab', label: 'ML Lab', icon: FlaskConical, description: 'Experimental models, coming soon.', soon: true },
]

export const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV]

export function findNav(pathname: string) {
  return ALL_NAV.find((item) => pathname.startsWith(item.path))
}
