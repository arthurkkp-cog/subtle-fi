import { formatAmount, getTransactionStatus, extractCustomerIdFromUrl } from './utils'

// Mock the functions that depend on external libraries
jest.mock('query-string', () => ({
  parseUrl: () => ({ query: { id: 'test-id' } }),
  stringifyUrl: () => 'mocked-url',
}))

// Setup window.location mock
delete (window as any).location
window.location = { pathname: '/test' }

describe('Utils', () => {
  describe('formatAmount', () => {
    it('formats positive numbers correctly', () => {
      expect(formatAmount(1234.56)).toBe('$1,234.56')
    })

    it('formats zero correctly', () => {
      expect(formatAmount(0)).toBe('$0.00')
    })

    it('formats large numbers correctly', () => {
      expect(formatAmount(1234567.89)).toBe('$1,234,567.89')
    })

    it('handles negative numbers', () => {
      expect(formatAmount(-123.45)).toBe('-$123.45')
    })
  })

  describe('getTransactionStatus', () => {
    it('returns "Processing" for recent transactions', () => {
      const today = new Date()
      const recentDate = new Date(today)
      recentDate.setDate(today.getDate() - 1)
      
      expect(getTransactionStatus(recentDate)).toBe('Processing')
    })

    it('returns "Success" for older transactions', () => {
      const today = new Date()
      const oldDate = new Date(today)
      oldDate.setDate(today.getDate() - 3)
      
      expect(getTransactionStatus(oldDate)).toBe('Success')
    })
  })

  describe('extractCustomerIdFromUrl', () => {
    it('extracts customer ID from Dwolla URL', () => {
      const url = 'https://api-sandbox.dwolla.com/customers/12345678-1234-1234-1234-123456789012'
      expect(extractCustomerIdFromUrl(url)).toBe('12345678-1234-1234-1234-123456789012')
    })

    it('returns last part of URL', () => {
      const url = 'https://example.com/invalid'
      expect(extractCustomerIdFromUrl(url)).toBe('invalid')
    })

    it('handles empty string', () => {
      expect(extractCustomerIdFromUrl('')).toBe('')
    })
  })
})
