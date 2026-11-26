import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ProductTour from "../ProductTour";
import { hasSeenTour, isNewAccount, markTourSeen, shouldAutoStartTour } from "../tourStorage";

jest.mock("lucide-react", () => ({
  ArrowLeft: () => <span />,
  ArrowRight: () => <span />,
  X: () => <span />,
}));

const steps = [
  { id: "one", kicker: "Welcome", title: "First step", body: "Hello" },
  { id: "two", kicker: "Step 1", title: "Second step", body: "Tags", targets: ["tags"], tab: "workflow" },
  { id: "three", kicker: "Done", title: "Last step", body: "Bye" },
];

describe("ProductTour", () => {
  it("renders nothing when closed", () => {
    render(<ProductTour open={false} steps={steps} onClose={jest.fn()} />);
    expect(screen.queryByTestId("product-tour")).not.toBeInTheDocument();
  });

  it("steps forward and back, then finishes", () => {
    const onClose = jest.fn();
    const onStep = jest.fn();
    render(<ProductTour open steps={steps} onClose={onClose} onStep={onStep} />);
    expect(screen.getByRole("dialog")).toHaveTextContent("First step");
    expect(screen.getByText("Show me around")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("tour-next"));
    expect(screen.getByRole("dialog")).toHaveTextContent("Second step");
    expect(onStep).toHaveBeenLastCalledWith(steps[1], 1);

    fireEvent.click(screen.getByLabelText("Back"));
    expect(screen.getByRole("dialog")).toHaveTextContent("First step");

    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByRole("dialog")).toHaveTextContent("Last step");
    expect(screen.queryByLabelText("Skip the tour")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Done"));
    expect(onClose).toHaveBeenCalledWith({ completed: true, stepId: "three" });
  });

  it("skips with the Skip button and with Escape", () => {
    const onClose = jest.fn();
    render(<ProductTour open steps={steps} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Skip the tour"));
    expect(onClose).toHaveBeenLastCalledWith({ completed: false, stepId: "one" });
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe("tourStorage", () => {
  const now = Date.parse("2026-11-25T12:00:00Z");
  beforeEach(() => window.localStorage.clear());

  it("treats accounts under two weeks old as new", () => {
    expect(isNewAccount("2026-11-20T12:00:00Z", now)).toBe(true);
    expect(isNewAccount("2026-10-01T12:00:00Z", now)).toBe(false);
    expect(isNewAccount(undefined, now)).toBe(false);
    expect(isNewAccount("not a date", now)).toBe(false);
  });

  it("starts once for a new account, then remembers", () => {
    const user = { id: "u1", created_at: "2026-11-24T12:00:00Z" };
    expect(shouldAutoStartTour(user, now)).toBe(true);
    markTourSeen("u1");
    expect(hasSeenTour("u1")).toBe(true);
    expect(shouldAutoStartTour(user, now)).toBe(false);
    expect(shouldAutoStartTour({ id: "u2", created_at: "2026-11-24T12:00:00Z" }, now)).toBe(true);
  });
});
