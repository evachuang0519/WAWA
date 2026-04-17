import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

// Lazy-loaded views
const LoginView = () => import('@/views/LoginView.vue')
const DashboardView = () => import('@/views/DashboardView.vue')
const BookingsView = () => import('@/views/BookingsView.vue')
const PassengersView = () => import('@/views/PassengersView.vue')
const AssignmentsView = () => import('@/views/AssignmentsView.vue')
const DriversView = () => import('@/views/DriversView.vue')
const VehiclesView = () => import('@/views/VehiclesView.vue')
const DriverTasksView = () => import('@/views/DriverTasksView.vue')
const ServiceRecordsView = () => import('@/views/ServiceRecordsView.vue')
const CareUnitsView = () => import('@/views/CareUnitsView.vue')
const CompaniesView = () => import('@/views/CompaniesView.vue')
const UsersView = () => import('@/views/UsersView.vue')
const RecurringTemplatesView = () => import('@/views/RecurringTemplatesView.vue')
const AppLayout = () => import('@/components/AppLayout.vue')

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { public: true }
  },
  {
    path: '/',
    component: AppLayout,
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: DashboardView,
        meta: { roles: ['system_admin'] }
      },
      {
        path: 'bookings',
        name: 'Bookings',
        component: BookingsView,
        meta: { roles: ['system_admin', 'org_admin'] }
      },
      {
        path: 'passengers',
        name: 'Passengers',
        component: PassengersView,
        meta: { roles: ['system_admin', 'org_admin'] }
      },
      {
        path: 'assignments',
        name: 'Assignments',
        component: AssignmentsView,
        meta: { roles: ['system_admin', 'fleet_admin'] }
      },
      {
        path: 'drivers',
        name: 'Drivers',
        component: DriversView,
        meta: { roles: ['system_admin', 'fleet_admin'] }
      },
      {
        path: 'vehicles',
        name: 'Vehicles',
        component: VehiclesView,
        meta: { roles: ['system_admin', 'fleet_admin'] }
      },
      {
        path: 'tasks',
        name: 'DriverTasks',
        component: DriverTasksView,
        meta: { roles: ['driver'] }
      },
      {
        path: 'service-records',
        name: 'ServiceRecords',
        component: ServiceRecordsView,
        meta: { roles: ['system_admin', 'org_admin', 'fleet_admin', 'driver'] }
      },
      {
        path: 'care-units',
        name: 'CareUnits',
        component: CareUnitsView,
        meta: { roles: ['system_admin', 'org_admin'] }
      },
      {
        path: 'companies',
        name: 'Companies',
        component: CompaniesView,
        meta: { roles: ['system_admin', 'fleet_admin'] }
      },
      {
        path: 'users',
        name: 'Users',
        component: UsersView,
        meta: { roles: ['system_admin'] }
      },
      {
        path: 'recurring-templates',
        name: 'RecurringTemplates',
        component: RecurringTemplatesView,
        meta: { roles: ['system_admin', 'org_admin'] }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Role-to-default-route mapping
const roleHome = {
  system_admin: '/dashboard',
  org_admin: '/bookings',
  fleet_admin: '/assignments',
  driver: '/tasks'
}

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // Skip guard for public routes
  if (to.meta.public) return true

  // Fetch user if not loaded yet
  if (!auth.user && !auth.loading) {
    await auth.fetchMe()
  }

  // Not logged in → go to login
  if (!auth.user) {
    return { path: '/login' }
  }

  // Root redirect
  if (to.path === '/') {
    return { path: roleHome[auth.user.role] ?? '/login' }
  }

  // Role check
  const allowed = to.meta.roles
  if (allowed && !allowed.includes(auth.user.role)) {
    return { path: roleHome[auth.user.role] ?? '/login' }
  }

  return true
})

export { roleHome }
export default router
