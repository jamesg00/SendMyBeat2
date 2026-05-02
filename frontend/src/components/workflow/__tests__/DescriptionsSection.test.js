import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import DescriptionsSection from "../DescriptionsSection";

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, type = "button", className, ...props }) => (
    <button type={type} onClick={onClick} disabled={disabled} className={className} {...props}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/card", () => ({
  Card: ({ children, className }) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }) => <div className={className}>{children}</div>,
  CardDescription: ({ children, className }) => <p className={className}>{children}</p>,
  CardHeader: ({ children, className }) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }) => <h3 className={className}>{children}</h3>,
}));

jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }) => <div>{children}</div>,
  DialogContent: ({ children }) => <div>{children}</div>,
  DialogDescription: ({ children }) => <p>{children}</p>,
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <h4>{children}</h4>,
  DialogTrigger: ({ children }) => <>{children}</>,
}));

jest.mock("@/components/ui/input", () => ({
  Input: (props) => <input {...props} />,
}));

jest.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }) => <label {...props}>{children}</label>,
}));

jest.mock("@/components/ui/textarea", () => ({
  Textarea: (props) => <textarea {...props} />,
}));

jest.mock("lucide-react", () => ({
  Copy: () => <span>CopyIcon</span>,
  Edit: () => <span>EditIcon</span>,
  Save: () => <span>SaveIcon</span>,
  Trash2: () => <span>TrashIcon</span>,
}));

const baseProps = {
  descriptions: [],
  newDescription: { title: "", content: "" },
  visibleDescriptionTemplates: [
    { id: "1", name: "Basic Type Beat", blurb: "SEO-first template" },
    { id: "2", name: "Beat Sales", blurb: "Selling-focused template" },
  ],
  descriptionTemplates: [
    { id: "1", name: "Basic Type Beat", blurb: "SEO-first template" },
    { id: "2", name: "Beat Sales", blurb: "Selling-focused template" },
    { id: "3", name: "SEO Discovery", blurb: "Discovery template" },
  ],
  showAllDescriptionTemplates: false,
  setShowAllDescriptionTemplates: jest.fn(),
  handleApplyDescriptionTemplate: jest.fn(),
  setNewDescription: jest.fn(),
  handleSaveDescription: jest.fn(),
  loadingDescriptions: false,
  expandedDescriptions: new Set(),
  editingDesc: null,
  setEditingDesc: jest.fn(),
  handleUpdateDescription: jest.fn(),
  handleDeleteDescription: jest.fn(),
  copyDescription: jest.fn(),
  toggleDescriptionExpand: jest.fn(),
};

describe("DescriptionsSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders editor mode with quick starts and save path", () => {
    render(<DescriptionsSection {...baseProps} mode="editor" />);

    expect(screen.getByText("Template Descriptions")).toBeInTheDocument();
    expect(screen.getByText("Quick Starts")).toBeInTheDocument();
    expect(screen.getByLabelText("Template Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Content")).toBeInTheDocument();
    expect(screen.getByTestId("save-desc-btn")).toBeInTheDocument();
  });

  test("applies starter template from editor mode", () => {
    render(<DescriptionsSection {...baseProps} mode="editor" />);

    fireEvent.click(screen.getByText("Basic Type Beat"));
    expect(baseProps.handleApplyDescriptionTemplate).toHaveBeenCalled();
  });

  test("renders empty saved descriptions state", () => {
    render(<DescriptionsSection {...baseProps} mode="results" />);

    expect(screen.getByText("Saved Descriptions")).toBeInTheDocument();
    expect(screen.getByText("Waiting for first save")).toBeInTheDocument();
    expect(screen.getByText("No saved descriptions yet. Your reusable versions will show up here after you save one.")).toBeInTheDocument();
  });

  test("renders saved descriptions when they exist", () => {
    render(
      <DescriptionsSection
        {...baseProps}
        mode="results"
        descriptions={[
          { id: "desc-1", title: "Free For Profit", content: "Use this beat for profit with credit." },
        ]}
      />
    );

    expect(screen.getByText("Saved Descriptions")).toBeInTheDocument();
    expect(screen.getByText("Free For Profit")).toBeInTheDocument();
    expect(screen.getByText("7 words")).toBeInTheDocument();
  });
});
