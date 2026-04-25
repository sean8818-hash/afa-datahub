import { useEffect, useState } from 'react'
import { Table, Card, Select, Input, Space, Tag, Typography } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { TestCategoryParam } from '../api/testCategoryParam'
import { getTestCategoryParams, getCategories } from '../api/testCategoryParam'

const { Title } = Typography

const categoryColors: Record<string, string> = {
  Balance: 'blue', Cognition: 'purple', Strength: 'red',
  Explosive: 'orange', Speed: 'green', Flexibility: 'cyan',
}

const columns: ColumnsType<TestCategoryParam> = [
  { title: 'Test ID', dataIndex: 'testid', width: 90 },
  { title: 'Test Name', dataIndex: 'testname', width: 160, ellipsis: true },
  { title: 'Tags', dataIndex: 'tags', width: 200, ellipsis: true },
  { title: 'Category', dataIndex: 'category', width: 120, render: (v) => <Tag color={categoryColors[v] || 'default'}>{v}</Tag> },
  { title: 'Code', dataIndex: 'code', width: 100 },
  { title: 'Short Name', dataIndex: 'shortname', width: 180, ellipsis: true },
  { title: 'Format', dataIndex: 'format', width: 90 },
  { title: 'Unit', dataIndex: 'unit', width: 80, render: (v) => v || '-' },
]

export default function TestCategoryParamPage() {
  const [data, setData] = useState<TestCategoryParam[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [filterCategory, setFilterCategory] = useState<string>()
  const [filterName, setFilterName] = useState('')

  useEffect(() => {
    getCategories().then(setCategories).catch(console.error)
  }, [])

  useEffect(() => {
    setLoading(true)
    getTestCategoryParams({
      page, page_size: 20,
      category: filterCategory,
      testname: filterName || undefined,
    })
      .then(res => { setData(res.data); setTotal(res.total) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page, filterCategory, filterName])

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>Test Category Params</Title>
      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="搜索测试名称..."
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            allowClear
            onChange={(e) => { setFilterName(e.target.value); setPage(1) }}
          />
          <Select
            placeholder="筛选 Category"
            style={{ width: 160 }}
            allowClear
            onChange={(v) => { setFilterCategory(v); setPage(1) }}
            options={categories.map((c) => ({ label: c, value: c }))}
          />
        </Space>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="code"
          loading={loading}
          scroll={{ x: 1100 }}
          pagination={{
            current: page, pageSize: 20, total,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p) => setPage(p),
          }}
          size="middle"
        />
      </Card>
    </div>
  )
}