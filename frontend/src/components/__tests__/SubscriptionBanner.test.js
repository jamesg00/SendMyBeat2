import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import SubscriptionBanner from '../SubscriptionBanner';
import axios from 'axios';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('axios');
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
  },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Zap: () => <div data-testid="icon-zap">Zap</div>,
  Sparkles: () => <div data-testid="icon-sparkles">Sparkles</div>,
  Upload: () => <div data-testid="icon-upload">Upload</div>,
  Settings: () => <div data-testid="icon-settings">Settings</div>,
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }) => <div className={className} data-testid="ui-card">{children}</div>,
  CardContent: ({ children, className }) => <div className={className} data-testid="ui-card-content">{children}</div>,
}));
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...props }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-testid={props['data-testid'] || "ui-button"}
      {...props}
    >
      {children}
    </button>
  ),
}));

describe('SubscriptionBanner', () => {
  const defaultProps = {
    creditsRemaining: 3,
    uploadCreditsRemaining: 3,
    resetsAt: new Date(Date.now() + 86400000).toISOString(), // 24h from now
    isSubscribed: false,
    onUpgrade: jest.fn(),
    API: 'http://localhost:8000',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders Free tier correctly with full credits', () => {
    render(<SubscriptionBanner {...defaultProps} />);

    expect(screen.getByText('Free Daily Credits')).toBeInTheDocument();
    expect(screen.getByText('AI Generations')).toBeInTheDocument();
    expect(screen.getByText('YouTube Uploads')).toBeInTheDocument();

    // Check credit counts
    const creditCounts = screen.getAllByText('3');
    expect(creditCounts.length).toBeGreaterThanOrEqual(2); // One for AI, one for Uploads

    expect(screen.getByText('Want Unlimited? Upgrade to Pro')).toBeInTheDocument();
  });

  test('renders Pro tier correctly', () => {
    render(<SubscriptionBanner {...defaultProps} isSubscribed={true} />);

    expect(screen.getByText('SendMyBeat Pro')).toBeInTheDocument();
    expect(screen.getByText(/Unlimited AI generations/)).toBeInTheDocument();
    expect(screen.getByText('UNLIMITED')).toBeInTheDocument();

    const manageBtn = screen.getByText('Manage Subscription');
    expect(manageBtn).toBeInTheDocument();
    expect(screen.queryByText('Free Daily Credits')).not.toBeInTheDocument();
  });

  test('renders error state when credits are undefined', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const props = { ...defaultProps, creditsRemaining: undefined };
    render(<SubscriptionBanner {...props} />);

    expect(screen.getByText(/Unable to load credit information/i)).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  test('displays warning when AI credits are low (0)', () => {
    const props = { ...defaultProps, creditsRemaining: 0 };
    render(<SubscriptionBanner {...props} />);

    // Check for specific warning message
    expect(screen.getByText('🚫 No AI generations left for today')).toBeInTheDocument();

    // Check that the upgrade button is prominent (not "Want Unlimited?...")
    expect(screen.getByTestId('upgrade-banner-btn')).toBeInTheDocument();
    expect(screen.getByText('Upgrade to Pro - Unlimited Access')).toBeInTheDocument();
  });

  test('displays warning when Upload credits are low (0)', () => {
    const props = { ...defaultProps, uploadCreditsRemaining: 0 };
    render(<SubscriptionBanner {...props} />);

    expect(screen.getByText('🚫 No uploads left for today')).toBeInTheDocument();
    expect(screen.getByTestId('upgrade-banner-btn')).toBeInTheDocument();
  });

  test('displays warning when ALL credits are low (0)', () => {
    const props = { ...defaultProps, creditsRemaining: 0, uploadCreditsRemaining: 0 };
    render(<SubscriptionBanner {...props} />);

    expect(screen.getByText('🚫 All free credits used for today')).toBeInTheDocument();
    expect(screen.getByTestId('upgrade-banner-btn')).toBeInTheDocument();
  });

  test('onUpgrade is called when upgrade button is clicked', () => {
    render(<SubscriptionBanner {...defaultProps} />);

    fireEvent.click(screen.getByText('Want Unlimited? Upgrade to Pro'));
    expect(defaultProps.onUpgrade).toHaveBeenCalledTimes(1);
  });

  test('manage subscription flow', async () => {
    axios.post.mockResolvedValueOnce({ data: { url: 'http://stripe.com/portal' } });

    // Mock window.location.href
    delete window.location;
    window.location = { href: '' };

    render(<SubscriptionBanner {...defaultProps} isSubscribed={true} />);

    const manageBtn = screen.getByText('Manage Subscription');
    fireEvent.click(manageBtn);

    // Should show loading state
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Wait for async action
    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(axios.post).toHaveBeenCalledWith(`${defaultProps.API}/subscription/portal`);
    expect(window.location.href).toBe('http://stripe.com/portal');
  });

  test('manage subscription failure handles error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    axios.post.mockRejectedValueOnce(new Error('Network error'));

    render(<SubscriptionBanner {...defaultProps} isSubscribed={true} />);

    const manageBtn = screen.getByText('Manage Subscription');
    fireEvent.click(manageBtn);

    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(toast.error).toHaveBeenCalledWith('Failed to open subscription management');
    // Should return to normal state
    expect(screen.getByText('Manage Subscription')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  test('reset timer logic', () => {
    // Mock Date.now to a fixed timestamp
    const now = 1600000000000; // specific time
    const resetsAt = new Date(now + 3661000).toISOString(); // 1h 1m 1s later

    jest.useFakeTimers();
    jest.setSystemTime(now);

    const props = { ...defaultProps, resetsAt };

    // We need to re-render or trigger an update for the timer to show correctly if it depends on state.
    // The component sets state in useEffect, which might be tricky with fake timers if not handled carefully.
    // However, initial render uses Date.now(), so let's render AFTER setting system time.

    // Wait, the component sets initial state: useState(Date.now()).
    // So if we setSystemTime before render, it should pick it up.

    // We need to trigger the low credit state to see the reset message
    render(<SubscriptionBanner {...props} creditsRemaining={0} />);

    // 3661 seconds = 1h 1m 1s
    expect(screen.getByText(/Resets in 1h 1m/)).toBeInTheDocument();

    jest.useRealTimers();
  });
});
