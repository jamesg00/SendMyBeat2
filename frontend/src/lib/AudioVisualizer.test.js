
import AudioVisualizer from './AudioVisualizer';

// Mocks for browser APIs
class MockAudioContext {
  constructor() {
    this.state = 'running';
    this.sampleRate = 48000;
  }
  createAnalyser() {
    return {
      fftSize: 2048,
      frequencyBinCount: 1024,
      connect: jest.fn(),
      disconnect: jest.fn(),
      getByteFrequencyData: jest.fn(),
    };
  }
  createMediaElementSource() {
    return {
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
  }
  resume() {
    return Promise.resolve();
  }
}

global.window.AudioContext = MockAudioContext;
global.window.webkitAudioContext = MockAudioContext;

// Mock matchMedia
global.window.matchMedia = jest.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}));

describe('AudioVisualizer', () => {
  let canvas;
  let visualizer;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    // Mock getContext
    canvas.getContext = jest.fn().mockReturnValue({
        setTransform: jest.fn(),
        clearRect: jest.fn(),
        save: jest.fn(),
        restore: jest.fn(),
        translate: jest.fn(),
        rotate: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        quadraticCurveTo: jest.fn(),
        closePath: jest.fn(),
        stroke: jest.fn(),
        fill: jest.fn(),
        arc: jest.fn(),
        clip: jest.fn(),
        drawImage: jest.fn(),
        createConicGradient: jest.fn().mockReturnValue({
            addColorStop: jest.fn()
        }),
        createRadialGradient: jest.fn().mockReturnValue({
            addColorStop: jest.fn()
        }),
        fillRect: jest.fn(),
        strokeRect: jest.fn(),
    });
  });

  afterEach(() => {
    if (visualizer) {
      visualizer.destroy();
    }
  });

  test('initializes with default options', () => {
    visualizer = new AudioVisualizer(canvas);
    // Check some defaults from the file
    expect(visualizer.options.fftSize).toBe(16384);
    expect(visualizer.options.bars).toBe(128);
    expect(visualizer.options.minHz).toBe(20);
    expect(visualizer.options.maxHz).toBe(18000);
  });

  test('overrides defaults with provided options', () => {
    const options = {
      bars: 64,
      minHz: 50,
      spectrumColor: "255, 0, 0"
    };
    visualizer = new AudioVisualizer(canvas, options);
    expect(visualizer.options.bars).toBe(64);
    expect(visualizer.options.minHz).toBe(50);
    expect(visualizer.options.spectrumColor).toBe("255, 0, 0");
    // Should still have other defaults
    expect(visualizer.options.fftSize).toBe(16384);
  });

  test('setOptions updates configuration', () => {
    visualizer = new AudioVisualizer(canvas);
    visualizer.setOptions({
        bars: 200,
        gain: 0.8
    });
    expect(visualizer.options.bars).toBe(200);
    expect(visualizer.options.gain).toBe(0.8);
  });

  test('resize handles canvas dimensions', () => {
    visualizer = new AudioVisualizer(canvas);
    // Mock getBoundingClientRect
    canvas.getBoundingClientRect = jest.fn().mockReturnValue({
        width: 1000,
        height: 500
    });

    // Trigger resize manually since we can't easily trigger window resize event in jsdom exactly like browser
    visualizer.resize();

    // Internal canvas size should match (assuming dpr=1 in test)
    expect(canvas.width).toBe(1000);
    expect(canvas.height).toBe(500);
  });

  test('getFreqBand returns correct band for frequency', () => {
      visualizer = new AudioVisualizer(canvas);
      // These magic numbers 220 and 3200 are what we might refactor
      expect(visualizer.getFreqBand(100)).toBe('low');
      expect(visualizer.getFreqBand(219)).toBe('low');
      expect(visualizer.getFreqBand(220)).toBe('mid'); // Edge case check
      expect(visualizer.getFreqBand(1000)).toBe('mid');
      expect(visualizer.getFreqBand(3199)).toBe('mid');
      expect(visualizer.getFreqBand(3200)).toBe('high'); // Edge case check
      expect(visualizer.getFreqBand(5000)).toBe('high');
  });

});
