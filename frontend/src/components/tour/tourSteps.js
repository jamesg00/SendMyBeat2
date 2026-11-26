// The website's guided tour. Each step points at an element by its data-tour attribute, so the
// tour keeps working when layouts and styles change. A step lists more than one name when the
// thing lives in different places on desktop and phones (sidebar vs. tab bar); the first one
// that's on screen wins. A step with no target shows as a centered card.
//
// `tab` is the Dashboard tab the step's target lives on; the Dashboard switches to it first.

export const TOUR_STEPS = [
  {
    id: "welcome",
    kicker: "Welcome",
    title: "Your beat, from folder to YouTube",
    body:
      "SendMyBeat writes your tags and description, makes the video and uploads it for you. This quick look takes about a minute.",
    tab: "workflow",
  },
  {
    id: "nav",
    kicker: "Getting around",
    title: "Four places to know",
    body:
      "Create is where you work on a beat. Analytics checks how your channel is doing. Spotlight is where producers get seen. Settings holds your plan, Google account and theme.",
    targets: ["nav", "tabbar"],
    tab: "workflow",
  },
  {
    id: "tags",
    kicker: "Step 1",
    title: "Start with tags",
    body:
      "Type what your beat sounds like or who it's for, like \"Drake type beat\", and generate. You get YouTube tags scored by how likely they are to get found.",
    targets: ["tags"],
    tab: "workflow",
  },
  {
    id: "descriptions",
    kicker: "Step 2",
    title: "Save your description once",
    body:
      "Write one or start from a template. Your links, contact and pricing get reused on every upload, so you never retype them.",
    targets: ["descriptions"],
    tab: "workflow",
  },
  {
    id: "review",
    kicker: "Step 3",
    title: "Check it before it goes out",
    body: "Your tags and description land here. Drop any tag you don't like and copy everything in one click.",
    targets: ["review"],
    tab: "workflow",
  },
  {
    id: "upload",
    kicker: "Step 4",
    title: "Make the video and publish",
    body:
      "Add your beat and cover art, pick a visualizer and preview it. Connect YouTube once, then publish straight to your channel. No video editor needed.",
    targets: ["upload"],
    tab: "workflow",
    align: "start",
  },
  {
    id: "credits",
    kicker: "Credits",
    title: "What you have left",
    body:
      "Generating tags and uploading each use a credit. Your balance and when it refills are always here, and plans add more.",
    targets: ["credits"],
    tab: "workflow",
  },
  {
    id: "spotlight",
    kicker: "Spotlight",
    title: "Get seen by other producers",
    body: "Verify with Google, show your best beats and see who's trending this week.",
    targets: ["nav-spotlight", "tab-spotlight"],
    tab: "workflow",
  },
  {
    id: "done",
    kicker: "You're set",
    title: "Go make your first upload",
    body: "You can watch this again any time from Settings.",
    tab: "workflow",
  },
];

export default TOUR_STEPS;
