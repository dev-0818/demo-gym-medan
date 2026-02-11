export type UserRole = 'admin' | 'staff' | 'trainer' | 'member'

export type MembershipStatus = 'active' | 'expired' | 'pending' | 'frozen'

export type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'cancelled'

export type PaymentMethod = 'cash' | 'transfer' | 'qris' | 'debit'

export type Gender = 'male' | 'female'

export type BloodType = 'A' | 'B' | 'AB' | 'O' | ''

export interface User {
  id: string
  name: string
  email: string
  phone: string
  password: string
  role: UserRole
  gender: Gender
  nik?: string
  birthDate?: string
  bloodType?: BloodType
  emergencyContact?: string
  emergencyPhone?: string
  photo?: string
  address: string
  notes?: string
  avatar?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface GymPackage {
  id: string
  name: string
  description: string
  durationDays: number
  price: number
  features: string[]
  isActive: boolean
  createdAt: string
}

export interface Membership {
  id: string
  memberId: string
  packageId: string
  trainerId?: string
  startDate: string
  endDate: string
  status: MembershipStatus
  notes: string
  createdAt: string
}

export interface Payment {
  id: string
  membershipId: string
  memberId: string
  amount: number
  method: PaymentMethod
  status: PaymentStatus
  invoiceNumber: string
  notes: string
  paidAt: string
  createdAt: string
}

export interface DashboardStats {
  totalMembers: number
  activeMembers: number
  totalStaff: number
  totalTrainers: number
  monthlyRevenue: number
  pendingPayments: number
  expiringMemberships: number
  newMembersThisMonth: number
}

export interface ChartData {
  labels: string[]
  values: number[]
}

export interface TableColumn {
  key: string
  label: string
  sortable?: boolean
  class?: string
}

export type ActivityAction = 'create' | 'update' | 'delete' | 'reset_password' | 'toggle_active' | 'checkin'

export interface ActivityLog {
  id: string
  userId: string       // who performed the action
  userName: string
  userRole: UserRole
  action: ActivityAction
  targetType: string   // 'member' | 'staff' | 'trainer' | 'package' | 'membership' | 'payment' | 'checkin'
  targetId: string
  targetName: string
  details: string
  timestamp: string
}

export interface CheckIn {
  id: string
  memberId: string
  memberName: string
  checkInTime: string
  checkOutTime?: string
  notes: string
}

export type ClassCategory = 'cardio' | 'strength' | 'functional' | 'mind-body'

export interface GymClass {
  id: string
  name: string
  category: ClassCategory
  description: string
  isActive: boolean
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export interface ClassSchedule {
  id: string
  classId: string
  trainerId?: string
  day: DayOfWeek
  startTime: string    // HH:mm
  endTime: string      // HH:mm
  maxParticipants: number
  room: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// --- Personal Trainer (PT) Session ---

export type PTSubscriptionStatus = 'active' | 'completed' | 'expired' | 'cancelled'

/** Master data: PT session packages (e.g. 8 sesi = Rp1.200.000) */
export interface PTPackage {
  id: string
  name: string
  sessions: number        // jumlah sesi
  pricePerSession: number // harga per sesi
  totalPrice: number      // total harga (sessions * pricePerSession or custom)
  description: string
  isActive: boolean
  createdAt: string
}

/** A member's PT subscription (member beli paket PT) */
export interface PTSubscription {
  id: string
  memberId: string
  trainerId: string
  ptPackageId: string
  totalSessions: number
  usedSessions: number
  status: PTSubscriptionStatus
  startDate: string
  endDate: string
  notes: string
  createdAt: string
}
