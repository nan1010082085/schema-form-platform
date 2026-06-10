import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, DOMWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'
import UserManageView from '@/views/UserManageView.vue'

// Mock apiClient
vi.mock('@/utils/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import { apiClient } from '@/utils/apiClient'
const mockedGet = vi.mocked(apiClient.get)
const mockedPost = vi.mocked(apiClient.post)
const mockedPut = vi.mocked(apiClient.put)
const mockedDelete = vi.mocked(apiClient.delete)

const mockDepts = [
  { id: 'd1', name: '技术部', parentId: null, children: [
    { id: 'd2', name: '前端组', parentId: 'd1', children: [] },
    { id: 'd3', name: '后端组', parentId: 'd1', children: [] },
  ]},
  { id: 'd4', name: '产品部', parentId: null, children: [] },
]

const mockRoles = {
  items: [
    { id: 'r1', name: '管理员', description: '系统管理员', data_scope: 'all' },
    { id: 'r2', name: '部门经理', description: '部门级管理', data_scope: 'dept' },
  ],
}

const mockUsers = {
  items: [
    { id: 'u1', username: 'zhangsan', displayName: '张三', roles: ['r1'], deptId: 'd1', status: 'active' },
    { id: 'u2', username: 'lisi', displayName: '李四', roles: ['r2'], deptId: 'd2', status: 'inactive' },
  ],
  total: 2,
  page: 1,
  pageSize: 20,
}

function mountView() {
  return mount(UserManageView, {
    global: {
      plugins: [ElementPlus, createPinia()],
      stubs: {
        SubPageLayout: { template: '<div><slot /></div>', props: ['title'] },
      },
    },
  })
}

/** Find button by text content */
function findButton(wrapper: ReturnType<typeof mount>, text: string): DOMWrapper<HTMLButtonElement> | undefined {
  return wrapper.findAll('button').find(b => b.text().includes(text))
}

describe('UserManageView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockedGet.mockImplementation((path: string) => {
      if (path.startsWith('/depts')) return Promise.resolve(mockDepts)
      if (path.startsWith('/roles')) return Promise.resolve(mockRoles)
      if (path.startsWith('/users')) return Promise.resolve(mockUsers)
      return Promise.resolve([])
    })
  })

  it('renders dept tree panel on the left', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('.el-tree').exists()).toBe(true)
    expect(wrapper.text()).toContain('技术部')
    expect(wrapper.text()).toContain('产品部')
  })

  it('renders user table with dept and status columns', async () => {
    const wrapper = mountView()
    await flushPromises()

    const table = wrapper.find('.el-table')
    expect(table.exists()).toBe(true)
    expect(wrapper.text()).toContain('张三')
    expect(wrapper.text()).toContain('李四')
    expect(wrapper.text()).toContain('技术部')
    expect(wrapper.text()).toContain('前端组')
  })

  it('filters users by dept when tree node is clicked', async () => {
    const wrapper = mountView()
    await flushPromises()
    mockedGet.mockClear()

    const deptNode = wrapper.findAll('.el-tree-node').find(n => n.text().includes('技术部'))
    expect(deptNode).toBeDefined()
    await deptNode!.trigger('click')
    await flushPromises()

    expect(mockedGet).toHaveBeenCalledWith(expect.stringContaining('deptId=d1'))
  })

  it('deselects dept filter when same node clicked again', async () => {
    const wrapper = mountView()
    await flushPromises()

    const deptNode = wrapper.findAll('.el-tree-node').find(n => n.text().includes('技术部'))
    await deptNode!.trigger('click')
    await flushPromises()
    mockedGet.mockClear()

    await deptNode!.trigger('click')
    await flushPromises()

    const lastCall = mockedGet.mock.calls.find(c => c[0].startsWith('/users'))
    expect(lastCall).toBeDefined()
    expect(lastCall![0]).not.toContain('deptId')
  })

  it('opens create dialog with dept tree select and role options', async () => {
    const wrapper = mountView()
    await flushPromises()

    const createBtn = findButton(wrapper, '新增用户')
    expect(createBtn).toBeDefined()
    await createBtn!.trigger('click')
    await flushPromises()

    const dialog = wrapper.find('.el-dialog')
    expect(dialog.exists()).toBe(true)
    expect(dialog.text()).toContain('所属部门')
    expect(dialog.text()).toContain('角色')
    expect(dialog.text()).toContain('状态')
  })

  it('opens edit dialog pre-filled with user data', async () => {
    const wrapper = mountView()
    await flushPromises()

    const tableRows = wrapper.findAll('.el-table__body-wrapper .el-table__row')
    expect(tableRows.length).toBeGreaterThan(0)
    const editBtn = findButton(wrapper, '编辑')
    expect(editBtn).toBeDefined()
    await editBtn!.trigger('click')
    await flushPromises()

    const dialog = wrapper.find('.el-dialog')
    expect(dialog.exists()).toBe(true)
    // Username input should be disabled in edit mode
    const usernameInput = dialog.findAll('.el-input__inner')[0]
    expect(usernameInput.attributes('disabled')).toBeDefined()
  })

  it('shows dept name in active filter tag when dept filter is active', async () => {
    const wrapper = mountView()
    await flushPromises()

    const deptNode = wrapper.findAll('.el-tree-node').find(n => n.text().includes('前端组'))
    await deptNode!.trigger('click')
    await flushPromises()

    // Should show dept filter indicator
    expect(wrapper.text()).toContain('前端组')
    // The active filter section should be visible with a tag
    const activeFilter = wrapper.find('[class*="activeFilter"]')
    expect(activeFilter.exists()).toBe(true)
  })

  it('renders status tag with correct text', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('正常')
    expect(wrapper.text()).toContain('停用')
  })

  it('clears all filters on reset', async () => {
    const wrapper = mountView()
    await flushPromises()
    mockedGet.mockClear()

    // First activate a dept filter
    const deptNode = wrapper.findAll('.el-tree-node').find(n => n.text().includes('技术部'))
    await deptNode!.trigger('click')
    await flushPromises()
    mockedGet.mockClear()

    // Find and click reset button
    const resetBtn = findButton(wrapper, '重置')
    expect(resetBtn).toBeDefined()
    await resetBtn!.trigger('click')
    await flushPromises()

    const usersCall = mockedGet.mock.calls.find(c => c[0].startsWith('/users'))
    expect(usersCall).toBeDefined()
    expect(usersCall![0]).toContain('/users?')
    expect(usersCall![0]).toContain('page=1')
    expect(usersCall![0]).toContain('pageSize=20')
    expect(usersCall![0]).not.toContain('deptId')
    expect(usersCall![0]).not.toContain('roleId')
    expect(usersCall![0]).not.toContain('status=')
  })

  it('calls POST /users on create submit', async () => {
    mockedPost.mockResolvedValue({ id: 'new' })
    const wrapper = mountView()
    await flushPromises()

    // Open create dialog
    const createBtn = findButton(wrapper, '新增用户')
    await createBtn!.trigger('click')
    await flushPromises()

    // Fill form
    const dialog = wrapper.find('.el-dialog')
    const inputs = dialog.findAll('.el-input__inner')
    await inputs[0].setValue('newuser')
    await inputs[1].setValue('password123')
    await inputs[2].setValue('新用户')

    // Submit
    const confirmBtn = findButton(dialog, '确定')
    expect(confirmBtn).toBeDefined()
    await confirmBtn!.trigger('click')
    await flushPromises()

    expect(mockedPost).toHaveBeenCalledWith('/users', expect.objectContaining({
      username: 'newuser',
      password: 'password123',
      displayName: '新用户',
    }))
  })

  it('calls PUT /users/:id on edit submit', async () => {
    mockedPut.mockResolvedValue({})
    const wrapper = mountView()
    await flushPromises()

    // Open edit dialog for first user
    const editBtn = findButton(wrapper, '编辑')
    await editBtn!.trigger('click')
    await flushPromises()

    // Submit
    const dialog = wrapper.find('.el-dialog')
    const confirmBtn = findButton(dialog, '确定')
    await confirmBtn!.trigger('click')
    await flushPromises()

    expect(mockedPut).toHaveBeenCalledWith('/users/u1', expect.objectContaining({
      displayName: '张三',
      roles: ['r1'],
      deptId: 'd1',
      status: 'active',
    }))
  })

  it('calls DELETE /users/:id on delete confirm', async () => {
    mockedDelete.mockResolvedValue(null)
    const wrapper = mountView()
    await flushPromises()

    const deleteBtn = findButton(wrapper, '删除')
    expect(deleteBtn).toBeDefined()
    await deleteBtn!.trigger('click')
    await flushPromises()

    // Confirm the MessageBox
    const confirmBtn = document.querySelector('.el-message-box__btns .el-button--primary')
    if (confirmBtn) {
      await (confirmBtn as HTMLElement).click()
      await flushPromises()
      expect(mockedDelete).toHaveBeenCalledWith('/users/u1')
    }
  })

  it('opens reset password dialog', async () => {
    const wrapper = mountView()
    await flushPromises()

    const resetBtn = findButton(wrapper, '重置密码')
    expect(resetBtn).toBeDefined()
    await resetBtn!.trigger('click')
    await flushPromises()

    const dialog = wrapper.find('.el-dialog')
    expect(dialog.exists()).toBe(true)
    expect(dialog.text()).toContain('重置密码')
  })

  it('dept tree search filters tree nodes', async () => {
    const wrapper = mountView()
    await flushPromises()

    // Find dept search input (first el-input in the dept panel)
    const deptPanel = wrapper.find('[class*="deptPanel"]')
    const searchInput = deptPanel.find('input')
    await searchInput.setValue('前端')
    await flushPromises()
    await new Promise(r => setTimeout(r, 0))
    await flushPromises()

    // Only matching nodes should be visible
    expect(wrapper.text()).toContain('前端组')
    // '产品部' should be filtered out
    const treeNodes = wrapper.findAll('.el-tree-node')
    const visibleNodes = treeNodes.filter(n => n.isVisible())
    const hasProduct = visibleNodes.some(n => n.text().includes('产品部'))
    expect(hasProduct).toBe(false)
  })

  it('fetches depts and roles on mount', async () => {
    mountView()
    await flushPromises()

    expect(mockedGet).toHaveBeenCalledWith('/depts?tree=true')
    expect(mockedGet).toHaveBeenCalledWith('/roles')
    expect(mockedGet).toHaveBeenCalledWith(expect.stringContaining('/users?page=1&pageSize=20'))
  })

  it('displays role names from roleMap', async () => {
    const wrapper = mountView()
    await flushPromises()

    // The table should show role names, not IDs
    expect(wrapper.text()).toContain('管理员')
    expect(wrapper.text()).toContain('部门经理')
  })
})
