import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import PublishWorkflow from "../PublishWorkflow";

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, className, ...props }) => (
    <button type="button" onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/card", () => ({
  Card: ({ children, className }) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }) => <div className={className}>{children}</div>,
}));

jest.mock("@/components/workflow/TagsSection", () => (props) => (
  <div data-testid={`tags-section-${props.mode}`}>Tags {props.mode}</div>
));

jest.mock("@/components/workflow/DescriptionsSection", () => (props) => (
  <div data-testid={`descriptions-section-${props.mode}`}>Descriptions {props.mode}</div>
));

jest.mock("@/components/UploadStudio", () => () => (
  <div data-testid="upload-studio">UploadStudio</div>
));

jest.mock("lucide-react", () => ({
  AlertCircle: () => <span>AlertCircle</span>,
  Sparkles: () => <span>Sparkles</span>,
  Youtube: () => <span>Youtube</span>,
}));

const baseProps = {
  subscriptionStatus: { is_subscribed: false },
  youtubeConnected: false,
  youtubeProfilePicture: "",
  youtubeName: "",
  youtubeEmail: "",
  onConnectYouTube: jest.fn(),
  onDisconnectYouTube: jest.fn(),
  onOpenAnalytics: jest.fn(),
  onOpenUpgrade: jest.fn(),
  hasPaidAnalyticsAccess: false,
  tagsSectionProps: {},
  descriptionsSectionProps: {},
  uploadStudioProps: {},
};

describe("PublishWorkflow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders workflow sections in metadata-first order", () => {
    render(<PublishWorkflow {...baseProps} />);

    expect(screen.getByText("1. Build Metadata")).toBeInTheDocument();
    expect(screen.getByTestId("tags-section-editor")).toBeInTheDocument();
    expect(screen.getByTestId("descriptions-section-editor")).toBeInTheDocument();
    expect(screen.getByText("Upload")).toBeInTheDocument();
    expect(screen.getByTestId("upload-studio")).toBeInTheDocument();
  });

  test("fires toolbar actions", () => {
    render(<PublishWorkflow {...baseProps} />);

    fireEvent.click(screen.getByRole("button", { name: /analytics/i }));
    fireEvent.click(screen.getByRole("button", { name: /upgrade/i }));
    fireEvent.click(screen.getByRole("button", { name: /connect youtube/i }));

    expect(baseProps.onOpenAnalytics).toHaveBeenCalledTimes(1);
    expect(baseProps.onOpenUpgrade).toHaveBeenCalledTimes(1);
    expect(baseProps.onConnectYouTube).toHaveBeenCalledTimes(1);
  });
});
