import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './button'

// Mock dependencies
jest.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}))

describe('Button', () => {
  it('renders a button with text', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole('button', { name: 'Click me' })
    expect(button).toBeInTheDocument()
  })

  it('handles click events', async () => {
    const handleClick = jest.fn()
    const user = userEvent.setup()
    
    render(<Button onClick={handleClick}>Click me</Button>)
    const button = screen.getByRole('button', { name: 'Click me' })
    
    await user.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>)
    const button = screen.getByRole('button', { name: 'Disabled' })
    expect(button).toBeDisabled()
  })

  it('passes through additional props', () => {
    render(<Button data-testid="test-button">Test</Button>)
    const button = screen.getByTestId('test-button')
    expect(button).toBeInTheDocument()
  })

  it('renders with custom className', () => {
    render(<Button className="custom-class">Test</Button>)
    const button = screen.getByRole('button', { name: 'Test' })
    expect(button).toHaveClass('custom-class')
  })

  it('renders different variants', () => {
    const { rerender } = render(<Button variant="destructive">Delete</Button>)
    let button = screen.getByRole('button', { name: 'Delete' })
    expect(button).toBeInTheDocument()

    rerender(<Button variant="outline">Outline</Button>)
    button = screen.getByRole('button', { name: 'Outline' })
    expect(button).toBeInTheDocument()
  })

  it('renders different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    let button = screen.getByRole('button', { name: 'Small' })
    expect(button).toBeInTheDocument()

    rerender(<Button size="lg">Large</Button>)
    button = screen.getByRole('button', { name: 'Large' })
    expect(button).toBeInTheDocument()
  })

  it('renders as child when asChild is true', () => {
    render(
      <Button asChild>
        <span>Custom Element</span>
      </Button>
    )
    const element = screen.getByText('Custom Element')
    expect(element).toBeInTheDocument()
  })
})
