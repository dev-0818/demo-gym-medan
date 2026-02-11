import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

/**
 * Role-based permission composable
 * 
 * Admin (Super Admin):
 *   - Full CRUD on all data
 *   - Delete, reset password, toggle active
 *   - Manage staff & trainers
 *   - View activity logs
 * 
 * Staff:
 *   - View all data
 *   - Add/create (input) members, memberships, payments
 *   - Edit members, memberships
 *   - View password & reset password for members
 *   - Check-in members
 *   - CANNOT delete any data
 *   - CANNOT toggle active status
 *   - CANNOT manage staff or trainer accounts
 */
export function usePermissions() {
  const authStore = useAuthStore()

  const currentRole = computed(() => authStore.currentUser?.role)
  const isAdmin = computed(() => currentRole.value === 'admin')
  const isStaff = computed(() => currentRole.value === 'staff')

  // --- Core permissions ---

  /** Can delete any record */
  const canDelete = computed(() => isAdmin.value)

  /** Can view passwords of users */
  const canViewPassword = computed(() => true)

  /** Can reset user passwords (both admin and staff can for members) */
  const canResetPassword = computed(() => true)

  /** Can toggle user active/inactive status */
  const canToggleActive = computed(() => isAdmin.value)

  /** Can manage Staff accounts (add/edit/delete) */
  const canManageStaff = computed(() => isAdmin.value)

  /** Can manage Trainer accounts (add/edit/delete) */
  const canManageTrainers = computed(() => isAdmin.value)

  /** Can view activity logs */
  const canViewLogs = computed(() => isAdmin.value)

  // --- Page-level permissions ---

  /** Can add new members */
  const canAddMembers = computed(() => true)

  /** Can edit members */
  const canEditMembers = computed(() => true)

  /** Can add/edit packages */
  const canManagePackages = computed(() => isAdmin.value)

  /** Can add memberships */
  const canAddMemberships = computed(() => true)

  /** Can edit memberships */
  const canEditMemberships = computed(() => true)

  /** Can add payments */
  const canAddPayments = computed(() => true)

  /** Can manage check-ins */
  const canManageCheckins = computed(() => true)

  /** Can manage class schedules (admin & staff) */
  const canManageClasses = computed(() => isAdmin.value || isStaff.value)

  /** Can view Trainer list (admin & staff) */
  const canViewTrainers = computed(() => isAdmin.value || isStaff.value)

  return {
    currentRole,
    isAdmin,
    isStaff,
    canDelete,
    canViewPassword,
    canResetPassword,
    canToggleActive,
    canManageStaff,
    canManageTrainers,
    canViewLogs,
    canAddMembers,
    canEditMembers,
    canManagePackages,
    canAddMemberships,
    canEditMemberships,
    canAddPayments,
    canManageCheckins,
    canManageClasses,
    canViewTrainers,
  }
}
