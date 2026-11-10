import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as api from "@/app/api";
import Paywall from "@/app/Paywall";
import { openPaywall, planName, refreshSubscription, requireCredit, requirePro, resetStores, usePaywall } from "@/app/store";

jest.mock("@/app/api");

const CONFIG = {
  plans: [
    { id: "plus", name: "Plus", price_cents: 500 },
    { id: "max", name: "Pro", price_cents: 1000 },
  ],
  founding: { price_cents: 4000, interval: "year", limit: 50 },
};
const FREE = { is_subscribed: false, plan: "free", daily_credits_remaining: 0, upload_credits_remaining: 0, trial_available: true, pro_access: false, founding_spots_left: 0 };
const PLUS = { is_subscribed: true, plan: "plus", daily_credits_remaining: 0, upload_credits_remaining: 12, pro_access: false };
const PRO = { is_subscribed: true, plan: "max", daily_credits_remaining: 80, upload_credits_remaining: 90, pro_access: true };

async function withPlan(status) {
  api.subscriptionStatus.mockResolvedValue(status);
  api.billingConfig.mockResolvedValue(CONFIG);
  await act(async () => {
    await refreshSubscription();
  });
}

function Probe() {
  const paywall = usePaywall();
  return <span data-testid="reason">{paywall?.reason ?? "closed"}</span>;
}

beforeEach(() => {
  jest.clearAllMocks();
  act(() => resetStores());
});

describe("planName", () => {
  it("names each plan the way the app does", () => {
    expect(planName(null)).toBe("…");
    expect(planName(FREE)).toBe("Free");
    expect(planName(PLUS)).toBe("Plus");
    expect(planName(PRO)).toBe("Pro");
    expect(planName({ ...PRO, founding_member: true })).toBe("Pro · Founding");
    expect(planName({ ...PLUS, trial: true })).toBe("Free trial");
  });
});

describe("credit and Pro checks", () => {
  it("lets you through while the plan is still loading", () => {
    expect(requireCredit("ai")).toBe(true);
    expect(requirePro()).toBe(true);
  });

  it("opens the plans with the right reason when you can't", async () => {
    render(<Probe />);
    await withPlan(PLUS);
    expect(requireCredit("upload")).toBe(true);
    act(() => {
      expect(requireCredit("ai")).toBe(false);
    });
    expect(screen.getByTestId("reason")).toHaveTextContent("out_of_credits");
    act(() => {
      expect(requirePro()).toBe(false);
    });
    expect(screen.getByTestId("reason")).toHaveTextContent("needs_pro");

    await withPlan(FREE);
    act(() => {
      expect(requireCredit("ai")).toBe(false);
    });
    expect(screen.getByTestId("reason")).toHaveTextContent("needs_plan");
  });
});

describe("Paywall", () => {
  it("offers the free trial on Plus to a free account, and Pro at full price", async () => {
    await withPlan(FREE);
    render(<Paywall />);
    act(() => openPaywall("needs_plan"));
    expect(await screen.findByRole("button", { name: "Start free trial" })).toBeInTheDocument();
    expect(screen.getByText("3 DAYS FREE")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /Pro/ }));
    expect(await screen.findByRole("button", { name: "Get Pro · $10/month" })).toBeInTheDocument();
  });

  it("starts checkout with the picked plan", async () => {
    await withPlan(FREE);
    api.createCheckout.mockResolvedValue({ switched: true });
    render(<Paywall />);
    act(() => openPaywall("needs_plan"));
    fireEvent.click(await screen.findByRole("button", { name: "Start free trial" }));
    await waitFor(() => expect(api.createCheckout).toHaveBeenCalledWith("plus", true));
  });

  it("offers Pro to a Plus subscriber, and billing to a Pro subscriber", async () => {
    await withPlan(PLUS);
    const { unmount } = render(<Paywall />);
    act(() => openPaywall("needs_pro"));
    expect(await screen.findByRole("button", { name: "Switch to Pro · $10/month" })).toBeInTheDocument();
    unmount();

    await withPlan(PRO);
    render(<Paywall />);
    act(() => openPaywall("needs_plan"));
    expect(await screen.findByRole("button", { name: "Manage billing" })).toBeInTheDocument();
    expect(screen.getByText("YOUR PLAN")).toBeInTheDocument();
  });
});
