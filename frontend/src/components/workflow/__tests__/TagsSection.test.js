import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import TagsSection from "../TagsSection";

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, type = "button", className, ...props }) => (
    <button type={type} onClick={onClick} disabled={disabled} className={className} {...props}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/card", () => ({
  Card: ({ children, className, ...props }) => <div className={className} {...props}>{children}</div>,
  CardContent: ({ children, className }) => <div className={className}>{children}</div>,
  CardDescription: ({ children, className }) => <p className={className}>{children}</p>,
  CardHeader: ({ children, className }) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }) => <h3 className={className}>{children}</h3>,
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
  Plus: () => <span>PlusIcon</span>,
  Sparkles: () => <span>SparklesIcon</span>,
  Trash2: () => <span>TrashIcon</span>,
}));

const baseProps = {
  tagHistory: [],
  selectedTagHistoryIds: [],
  joiningTagsLoading: false,
  joiningTagsProgress: 0,
  handleJoinSelectedTagHistory: jest.fn(),
  handleClearTagSelection: jest.fn(),
  formatTagHistoryLabel: (query) => query,
  activeTagHistoryId: null,
  handleTagHistoryTileClick: jest.fn(),
  handleDeleteTagHistoryItem: jest.fn(),
  generatedTags: [],
  loadingTags: false,
  handleGenerateTags: jest.fn((e) => e?.preventDefault?.()),
  copyTags: jest.fn(),
  generatedTagScores: {},
  normalizeTagKey: (tag) => tag,
  handleRemoveGeneratedTag: jest.fn(),
  additionalTags: "",
  setAdditionalTags: jest.fn(),
  tagLimit: 120,
  handleAddMoreTags: jest.fn(),
  canViewTagDebug: false,
  tagDebug: null,
  showTagDebug: false,
  setShowTagDebug: jest.fn(),
  tagQuery: "",
  setTagQuery: jest.fn(),
};

describe("TagsSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders editor mode with primary tag flow", () => {
    render(<TagsSection {...baseProps} mode="editor" />);

    expect(screen.getByText("Generate YouTube Tags")).toBeInTheDocument();
    expect(screen.getByLabelText("Search Query")).toBeInTheDocument();
    expect(screen.getByText("Recent Runs")).toBeInTheDocument();
    expect(screen.getByTestId("generate-tags-btn")).toBeInTheDocument();
  });

  test("submits generation from editor mode", () => {
    const { container } = render(<TagsSection {...baseProps} mode="editor" tagQuery="future type beat" />);

    fireEvent.submit(container.querySelector("form"));
    expect(baseProps.handleGenerateTags).toHaveBeenCalled();
  });

  test("renders recent tag history items and reopen state", () => {
    render(
      <TagsSection
        {...baseProps}
        mode="editor"
        tagHistory={[{ id: "1", query: "future type beat", tags: ["a", "b"] }]}
      />
    );

    expect(screen.getByText("future type beat")).toBeInTheDocument();
    expect(screen.getByText("Reopen")).toBeInTheDocument();
  });

  test("renders empty results tray", () => {
    render(<TagsSection {...baseProps} mode="results" />);

    expect(screen.getByText("Generated Tags")).toBeInTheDocument();
    expect(screen.getByText("Waiting for first run")).toBeInTheDocument();
    expect(screen.getByText("Your generated tag set will appear here after the first run.")).toBeInTheDocument();
  });

  test("renders generated tags and output controls when results exist", () => {
    render(
      <TagsSection
        {...baseProps}
        mode="results"
        generatedTags={["future type beat", "dark trap beat"]}
      />
    );

    expect(screen.getByText("Generated Tags (2)")).toBeInTheDocument();
    expect(screen.getByText("future type beat")).toBeInTheDocument();
    expect(screen.getByTestId("copy-tags-btn")).toBeInTheDocument();
    expect(screen.getByText("Add More Tags")).toBeInTheDocument();
  });
});
