import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      component: () => import('@/layouts/AdminLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
        },
        {
          path: 'members',
          name: 'members',
          component: () => import('@/views/MembersView.vue'),
        },
        {
          path: 'staff',
          name: 'staff',
          component: () => import('@/views/StaffView.vue'),
          meta: { adminOnly: true },
        },
        {
          path: 'trainers',
          name: 'trainers',
          component: () => import('@/views/TrainersView.vue'),
        },
        {
          path: 'packages',
          name: 'packages',
          component: () => import('@/views/PackagesView.vue'),
        },
        {
          path: 'memberships',
          name: 'memberships',
          component: () => import('@/views/MembershipsView.vue'),
        },
        {
          path: 'payments',
          name: 'payments',
          component: () => import('@/views/PaymentsView.vue'),
        },
        {
          path: 'reports',
          name: 'reports',
          component: () => import('@/views/ReportsView.vue'),
        },
        {
          path: 'checkins',
          name: 'checkins',
          component: () => import('@/views/CheckInsView.vue'),
        },
        {
          path: 'class-schedules',
          name: 'class-schedules',
          component: () => import('@/views/ClassScheduleView.vue'),
        },
        {
          path: 'activity-log',
          name: 'activity-log',
          component: () => import('@/views/ActivityLogView.vue'),
          meta: { adminOnly: true },
        },
      ],
    },
  ],
})

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth !== false && !authStore.isAuthenticated) {
    next({ name: 'login' })
  } else if (to.name === 'login' && authStore.isAuthenticated) {
    next({ name: 'dashboard' })
  } else if (to.meta.adminOnly && authStore.currentUser?.role !== 'admin') {
    next({ name: 'dashboard' })
  } else {
    next()
  }
})

export default router
