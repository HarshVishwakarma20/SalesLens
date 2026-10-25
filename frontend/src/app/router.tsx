import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from './layout/AppShell'
import { DataSourcePage } from '@/features/upload/DataSourcePage'
import { OverviewPage } from '@/features/overview/OverviewPage'
import { ComparePage } from '@/features/compare/ComparePage'
import { JourneyPage } from '@/features/journey/JourneyPage'
import { SegmentsPage } from '@/features/segments/SegmentsPage'
import { CohortsPage } from '@/features/cohorts/CohortsPage'
import { ReturnsPage } from '@/features/returns/ReturnsPage'
import { ProductsPage } from '@/features/products/ProductsPage'
import { AnomaliesPage } from '@/features/anomalies/AnomaliesPage'
import { RiskPage } from '@/features/risk/RiskPage'
import { SimulatorPage } from '@/features/simulator/SimulatorPage'
import { MethodologyPage } from '@/features/methodology/MethodologyPage'
import { MlLabPage } from '@/features/mllab/MlLabPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/data-source" replace /> },
      { path: 'data-source', element: <DataSourcePage /> },
      { path: 'overview', element: <OverviewPage /> },
      { path: 'compare', element: <ComparePage /> },
      { path: 'journey', element: <JourneyPage /> },
      { path: 'segments', element: <SegmentsPage /> },
      { path: 'cohorts', element: <CohortsPage /> },
      { path: 'returns', element: <ReturnsPage /> },
      { path: 'products', element: <ProductsPage /> },
      { path: 'anomalies', element: <AnomaliesPage /> },
      { path: 'risk', element: <RiskPage /> },
      { path: 'simulator', element: <SimulatorPage /> },
      { path: 'pipeline', element: <Navigate to="/overview" replace /> },
      { path: 'methodology', element: <MethodologyPage /> },
      { path: 'ml-lab', element: <MlLabPage /> },
      { path: '*', element: <Navigate to="/data-source" replace /> },
    ],
  },
])
