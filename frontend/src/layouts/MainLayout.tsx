import { Layout, Menu } from 'antd'
import { DashboardOutlined, TeamOutlined, ThunderboltOutlined, DatabaseOutlined } from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
const { Sider, Content, Header } = Layout
const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/athletes', icon: <TeamOutlined />, label: 'Athletes' },
  { key: '/performance', icon: <ThunderboltOutlined />, label: 'Performance' },
  { key: '/test-category-param', icon: <DatabaseOutlined />, label: 'Test Params' },
]
export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={220} style={{ background: '#0d1117' }}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', paddingLeft: 24, borderBottom: '1px solid #1e293b' }}>
          <span style={{ color: '#22c55e', fontWeight: 800, fontSize: 18 }}>AfaSense</span>
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]}
          onClick={({ key }) => navigate(key)} items={menuItems}
          style={{ background: '#0d1117', borderRight: 'none', marginTop: 8 }} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600 }}>Data Hub</span>
          <span style={{ color: '#94a3b8', fontSize: 13 }}>AfaSense Lab</span>
        </Header>
        <Content style={{ margin: 24 }}><Outlet /></Content>
      </Layout>
    </Layout>
  )
}
