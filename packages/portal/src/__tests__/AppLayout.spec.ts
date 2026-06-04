import { describe, it, expect, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'
import AppLayout from '@/layouts/AppLayout.vue'

/** 创建测试用路由器 */
function createTestRouter(initialPath = '/') {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: AppLayout,
        children: [
          { path: '', name: 'portal', component: { template: '<div>Portal</div>' } },
          { path: 'editor', name: 'editor', component: { template: '<div>Editor</div>' } },
          { path: 'flow', name: 'flow', component: { template: '<div>Flow</div>' } },
          { path: 'ai', name: 'ai', component: { template: '<div>AI</div>' } },
        ],
      },
    ],
  })
}

/** 挂载 AppLayout 的辅助函数 */
async function mountLayout(initialPath = '/'): Promise<VueWrapper> {
  const router = createTestRouter(initialPath)
  await router.push(initialPath)
  await router.isReady()

  return mount(AppLayout, {
    global: {
      plugins: [router, ElementPlus, createPinia()],
    },
  })
}

describe('AppLayout', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders the logo and platform name', async () => {
    const wrapper = await mountLayout()

    expect(wrapper.text()).toContain('PyFlow')
  })

  it('renders all four navigation items', async () => {
    const wrapper = await mountLayout()

    const navText = wrapper.text()
    expect(navText).toContain('首页')
    expect(navText).toContain('编辑器')
    expect(navText).toContain('流程')
    expect(navText).toContain('AI')
  })

  it('highlights the home nav item on root path', async () => {
    const wrapper = await mountLayout('/')

    // The active class should be on the home nav item
    const navItems = wrapper.findAll('a')
    const homeLink = navItems.find((a) => a.text() === '首页')
    expect(homeLink).toBeDefined()
    // Check it has the active style class (CSS Module hashed, so check for existence)
    expect(homeLink!.classes().some((c) => c.includes('navItemActive'))).toBe(true)
  })

  it('renders the version badge', async () => {
    const wrapper = await mountLayout()

    expect(wrapper.text()).toContain('v1.0.0')
  })

  it('has a GitHub link with target=_blank', async () => {
    const wrapper = await mountLayout()

    const githubLink = wrapper.find('a[href*="github.com"]')
    expect(githubLink.exists()).toBe(true)
    expect(githubLink.attributes('target')).toBe('_blank')
    expect(githubLink.attributes('rel')).toContain('noopener')
  })

  it('hamburger button is hidden on desktop (CSS driven)', async () => {
    const wrapper = await mountLayout()

    // The hamburger button exists in the DOM but is hidden via CSS on desktop
    const hamburger = wrapper.find('button[aria-label="打开导航菜单"]')
    expect(hamburger.exists()).toBe(true)
  })

  it('mobile drawer is initially closed', async () => {
    const wrapper = await mountLayout()

    // The mobile nav should not have the open class
    const mobileNav = wrapper.find('[role="dialog"]')
    expect(mobileNav.exists()).toBe(true)
    // Should not have the open modifier class
    expect(mobileNav.classes().some((c) => c.includes('mobileNavOpen'))).toBe(false)
  })

  it('opens mobile drawer when hamburger is clicked', async () => {
    const wrapper = await mountLayout()

    const hamburger = wrapper.find('button[aria-label="打开导航菜单"]')
    await hamburger.trigger('click')

    const mobileNav = wrapper.find('[role="dialog"]')
    expect(mobileNav.classes().some((c) => c.includes('mobileNavOpen'))).toBe(true)
  })

  it('closes mobile drawer when close button is clicked', async () => {
    const wrapper = await mountLayout()

    // Open drawer
    const hamburger = wrapper.find('button[aria-label="打开导航菜单"]')
    await hamburger.trigger('click')

    // Close drawer
    const closeBtn = wrapper.find('button[aria-label="关闭导航菜单"]')
    await closeBtn.trigger('click')

    const mobileNav = wrapper.find('[role="dialog"]')
    expect(mobileNav.classes().some((c) => c.includes('mobileNavOpen'))).toBe(false)
  })

  it('closes mobile drawer when overlay is clicked', async () => {
    const wrapper = await mountLayout()

    // Open drawer
    const hamburger = wrapper.find('button[aria-label="打开导航菜单"]')
    await hamburger.trigger('click')

    // Click overlay (the div before the aside)
    const overlay = wrapper.find('[class*="mobileOverlay"]')
    await overlay.trigger('click')

    const mobileNav = wrapper.find('[role="dialog"]')
    expect(mobileNav.classes().some((c) => c.includes('mobileNavOpen'))).toBe(false)
  })

  it('renders router-view for child routes', async () => {
    const wrapper = await mountLayout()

    // The main content area should exist
    const main = wrapper.find('main')
    expect(main.exists()).toBe(true)
  })
})
