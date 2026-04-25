import { Card, Row, Col, Statistic } from 'antd'
import { TeamOutlined, ThunderboltOutlined, CheckCircleOutlined } from '@ant-design/icons'
export default function Dashboard() {
  return (
    <div>
      <h2 style={{ marginBottom: 24, fontWeight: 700 }}>Dashboard</h2>
      <Row gutter={[16, 16]}>
        <Col span={8}><Card><Statistic title="Total Athletes" value={24} prefix={<TeamOutlined style={{ color: '#22c55e' }} />} /></Card></Col>
        <Col span={8}><Card><Statistic title="Ready Today" value={21} valueStyle={{ color: '#22c55e' }} prefix={<CheckCircleOutlined style={{ color: '#22c55e' }} />} /></Card></Col>
        <Col span={8}><Card><Statistic title="Need Attention" value={3} valueStyle={{ color: '#ef4444' }} prefix={<ThunderboltOutlined style={{ color: '#ef4444' }} />} /></Card></Col>
      </Row>
    </div>
  )
}
