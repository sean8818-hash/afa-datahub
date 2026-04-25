import api from './index'

export interface TestCategoryParam {
  testid: number
  testname: string
  tags: string
  category: string
  code: string
  shortname: string
  format: string
  unit: string | null
}

export interface PageResult {
  data: TestCategoryParam[]
  total: number
  page: number
  page_size: number
}

export const getTestCategoryParams = (params: {
  page?: number
  page_size?: number
  category?: string
  testname?: string
}) => api.get<any, PageResult>('/test-category-params', { params })

export const getCategories = () =>
  api.get<any, string[]>('/test-category-params/categories')
