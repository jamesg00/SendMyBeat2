import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import TitleHelper from "../TitleHelper";

jest.mock("axios");
jest.mock("@/App", () => ({ API: "http://test/api" }));

const IDEAS = [
  { title: 'Future Type Beat - "NEON"', keywords: ["future type beat"], covers: ["future type beat"], coverage: 90, length: 25, score: 75 },
  { title: 'Future x Gunna Type Beat - "NEON"', keywords: ["future x gunna type beat"], covers: [], coverage: 65, length: 33, score: 60 },
];

beforeEach(() => {
  jest.useFakeTimers();
  axios.get.mockResolvedValue({ data: { titles: IDEAS } });
  axios.post.mockResolvedValue({
    data: {
      score: 75,
      checks: [
        { id: "artist_first", ok: true, message: "Artist and 'type beat' in the first 40 characters" },
        { id: "top_keyword", ok: false, message: "Add 'dark trap', your run's top sound keyword" },
      ],
    },
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

test("shows title chips after a run and fills the title on tap", async () => {
  const onPick = jest.fn();
  render(<TitleHelper tagRunId="run-1" beatName="neon" title="" onPickTitle={onPick} />);

  expect(await screen.findByText('Future Type Beat - "NEON"')).toBeInTheDocument();
  expect(axios.get).toHaveBeenCalledWith("http://test/api/tags/history/run-1/titles", { params: { beat_name: "neon" } });

  fireEvent.click(screen.getByText('Future x Gunna Type Beat - "NEON"'));
  expect(onPick).toHaveBeenCalledWith('Future x Gunna Type Beat - "NEON"');
});

test("shows nothing without a tag run or a title", () => {
  const { container } = render(<TitleHelper tagRunId="" title="" onPickTitle={() => {}} />);
  expect(container).toBeEmptyDOMElement();
  expect(axios.get).not.toHaveBeenCalled();
});

test("checks the title a moment after typing stops", async () => {
  render(<TitleHelper tagRunId="run-1" title='Future Type Beat - "NEON"' onPickTitle={() => {}} />);
  expect(axios.post).not.toHaveBeenCalled();

  await act(async () => {
    jest.advanceTimersByTime(450);
  });

  await waitFor(() =>
    expect(axios.post).toHaveBeenCalledWith("http://test/api/titles/score", { title: 'Future Type Beat - "NEON"', tag_id: "run-1" })
  );
  expect(await screen.findByText("Add 'dark trap', your run's top sound keyword")).toBeInTheDocument();
  expect(screen.getByText(/Title score/)).toHaveTextContent("Title score 75");
});
