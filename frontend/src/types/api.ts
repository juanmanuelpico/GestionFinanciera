export type Role = 'USER' | 'ADMIN'

export interface User {
  id: string
  email: string
  name: string
  role: Role
  createdAt: string
  updatedAt: string
}

export interface AuthSession {
  user: User
  accessToken: string
}

export interface ApiResponse<T> {
  success: boolean
  data: T
}

export interface ApiErrorResponse {
  success: false
  statusCode: number
  message: string | string[]
  path: string
  timestamp: string
}
