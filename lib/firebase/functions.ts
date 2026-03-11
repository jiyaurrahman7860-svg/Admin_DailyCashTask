import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions'
import { app } from './firebaseConfig'

const functions = getFunctions(app)

// Use emulator in development
if (process.env.NODE_ENV === 'development') {
  connectFunctionsEmulator(functions, 'localhost', 5001)
}

// Wallet Functions (Admin)
export const creditWallet = (data: { userId: string; amount: number; type: string; description?: string }) =>
  httpsCallable(functions, 'creditWallet')(data)

export const debitWallet = (data: { userId: string; amount: number; description?: string }) =>
  httpsCallable(functions, 'debitWallet')(data)

// Withdrawal Functions (Admin)
export const approveWithdrawal = (data: { withdrawalId: string }) =>
  httpsCallable(functions, 'approveWithdrawal')(data)

export const rejectWithdrawal = (data: { withdrawalId: string; reason?: string }) =>
  httpsCallable(functions, 'rejectWithdrawal')(data)

// Task Functions (Admin)
export const approveTaskSubmission = (data: { submissionId: string }) =>
  httpsCallable(functions, 'approveTaskSubmission')(data)

export const rejectTaskSubmission = (data: { submissionId: string; reason?: string }) =>
  httpsCallable(functions, 'rejectTaskSubmission')(data)

export const getPendingSubmissions = (data?: { limit?: number }) =>
  httpsCallable(functions, 'getPendingSubmissions')(data || {})

// Health Check
export const healthCheck = () =>
  httpsCallable(functions, 'healthCheck')({})

// Admin Referral Functions
export const getAdminReferralStats = () =>
  httpsCallable(functions, 'getAdminReferralStats')({})

export const getUserReferralChain = (data: { userId: string }) =>
  httpsCallable(functions, 'getUserReferralChain')(data)

export const manualCalculateCommissions = (data?: { date?: string }) =>
  httpsCallable(functions, 'manualCalculateCommissions')(data || {})
