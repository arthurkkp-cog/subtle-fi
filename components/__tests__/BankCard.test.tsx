import { render, screen } from '@testing-library/react'
import BankCard from '../BankCard'
import { Account } from '@/types'

// Mock Next.js components
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, ...props }: any) => <img alt={alt} {...props} />,
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

jest.mock('@/components/CopyButton', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => (
    <button data-testid="copy-button">{title}</button>
  ),
}))

jest.mock('@/lib/utils', () => ({
  formatAmount: (amount: number) => `$${amount.toFixed(2)}`,
}))

describe('BankCard', () => {
  const mockAccount: Account = {
    id: '1',
    availableBalance: 1000,
    currentBalance: 1500,
    officialName: 'Test Bank',
    mask: '1234',
    institutionId: 'inst_1',
    name: 'Test Account',
    type: 'depository',
    subtype: 'checking',
    appwriteItemId: 'item_1',
    shareableId: 'share_123',
  }

  const defaultProps = {
    account: mockAccount,
    fullName: 'John Doe',
  }

  it('renders bank card with account information', () => {
    render(<BankCard {...defaultProps} />)
    
    expect(screen.getByText('Test Account')).toBeInTheDocument()
    expect(screen.getByText('$1500.00')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('●●●● ●●●● ●●●●1234')).toBeInTheDocument()
  })

  it('links to transaction history with correct query parameter', () => {
    render(<BankCard {...defaultProps} />)
    
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/transaction-history/?id=item_1')
  })

  it('shows copy button when showBalance is true', () => {
    render(<BankCard {...defaultProps} showBalance={true} />)
    
    expect(screen.getByTestId('copy-button')).toBeInTheDocument()
    expect(screen.getByTestId('copy-button')).toHaveTextContent('share_123')
  })

  it('hides copy button when showBalance is false', () => {
    render(<BankCard {...defaultProps} showBalance={false} />)
    
    expect(screen.queryByTestId('copy-button')).not.toBeInTheDocument()
  })

  it('displays bank card icons', () => {
    render(<BankCard {...defaultProps} />)
    
    expect(screen.getByAltText('pay')).toBeInTheDocument()
    expect(screen.getByAltText('mastercard')).toBeInTheDocument()
    expect(screen.getByAltText('lines')).toBeInTheDocument()
  })

  it('applies correct CSS classes', () => {
    render(<BankCard {...defaultProps} />)
    
    const cardContainer = screen.getByRole('link')
    expect(cardContainer).toHaveClass('bank-card')
    
    const content = screen.getByText('Test Account').closest('.bank-card_content')
    expect(content).toBeInTheDocument()
  })
})
