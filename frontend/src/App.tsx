import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Dashboard from './pages/Dashboard'
import Athletes from './pages/Athletes'
import Performance from './pages/Performance'
import TestCategoryParam from './pages/TestCategoryParam'
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="athletes" element={<Athletes />} />
        <Route path="performance" element={<Performance />} />
        <Route path="test-category-param" element={<TestCategoryParam />} />
      </Route>
    </Routes>
  )
}
