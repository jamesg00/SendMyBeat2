import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import { toast } from "sonner";
import SubscriptionBanner from "../SubscriptionBanner";

jest.mock("axios");
jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
  },
}));

jest.mock("lucide-react", () => ({
  Zap: () => <div data-testid="icon-zap">Zap</div>,
  Sparkles: () => <div data-testid="icon-sparkles">Sparkles</div>,
  Upload: () => <div data-testid="icon-upload">Upload</div>,
  Settings: () => <div data-testid="icon-settings">Settings</div>,
}));

jest.mock("@/components/ui/card", () => ({
  Card: ({ children, className }) => <div className={className} data-testid="ui-card">{children}</div>,
  CardContent: ({ children, className }) => <div className={className} data-testid="ui-card-content">{children}</div>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, className, ...props }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-testid={props["data-testid"] || "ui-button"}
      {...props}
    >
      {children}
    </button>
  ),
}));

describe("SubscriptionBanner", () => {
  const defaultProps = {
    creditsRemaining: 3,
    uploadCreditsRemaining: 3,
    resetsAt: new Date(Date.now() + 86400000).toISOString(),
    isSubscribed: false,
    onUpgrade: jest.fn(),
    API: "http://localhost:8000",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders free tier compact summary", () => {
    render(<SubscriptionBanner {...defaultProps} />);

    expect(screen.getByText("Free Daily Credits")).toBeInTheDocument();
    expect(screen.getByText("AI")).toBeInTheDocument();
    expect(screen.getByText("Uploads")).toBeInTheDocument();
    expect(screen.getAllByText("3/3")).toHaveLength(2);
    expect(screen.getByTestId("upgrade-banner-btn")).toHaveTextContent("Upgrade");
  });

  test("renders subscribed plan summary", () => {
    render(
      <SubscriptionBanner
        {...defaultProps}
        isSubscribed={true}
        plan="plus"
      />
    );

    expect(screen.getByText("SendMyBeat Plus")).toBeInTheDocument();
    expect(screen.getByText("3 AI generations + 3 uploads per month")).toBeInTheDocument();
    expect(screen.getByText("Metered")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /manage/i })).toBeInTheDocument();
  });

  test("returns null when free credit data is missing", () => {
    const { container } = render(
      <SubscriptionBanner
        {...defaultProps}
        creditsRemaining={undefined}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  test("calls onUpgrade when upgrade button is clicked", () => {
    render(<SubscriptionBanner {...defaultProps} />);

    fireEvent.click(screen.getByTestId("upgrade-banner-btn"));
    expect(defaultProps.onUpgrade).toHaveBeenCalledTimes(1);
  });

  test("shows low-credit state through counter values", () => {
    render(
      <SubscriptionBanner
        {...defaultProps}
        creditsRemaining={0}
        uploadCreditsRemaining={1}
      />
    );

    expect(screen.getByText("0/3")).toBeInTheDocument();
    expect(screen.getByText("1/3")).toBeInTheDocument();
    expect(screen.getByTestId("upgrade-banner-btn")).toBeInTheDocument();
  });

  test("manage subscription flow redirects to portal", async () => {
    axios.post.mockResolvedValueOnce({ data: { url: "http://stripe.com/portal" } });

    delete window.location;
    window.location = { href: "" };

    render(
      <SubscriptionBanner
        {...defaultProps}
        isSubscribed={true}
        plan="plus"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /manage/i }));

    expect(screen.getByRole("button", { name: /loading/i })).toBeInTheDocument();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(axios.post).toHaveBeenCalledWith(`${defaultProps.API}/subscription/portal`);
    expect(window.location.href).toBe("http://stripe.com/portal");
  });

  test("manage subscription failure shows toast", async () => {
    axios.post.mockRejectedValueOnce(new Error("Network error"));

    render(
      <SubscriptionBanner
        {...defaultProps}
        isSubscribed={true}
        plan="plus"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /manage/i }));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(toast.error).toHaveBeenCalledWith("Failed to open subscription management");
    expect(screen.getByRole("button", { name: /manage/i })).toBeInTheDocument();
  });

  test("shows reset countdown text", () => {
    const now = 1600000000000;
    const resetsAt = new Date(now + 3661000).toISOString();

    jest.useFakeTimers();
    jest.setSystemTime(now);

    render(<SubscriptionBanner {...defaultProps} resetsAt={resetsAt} />);

    expect(screen.getByText(/Resets in 1h 1m/)).toBeInTheDocument();

    jest.useRealTimers();
  });
});
