import { useEffect, useRef } from "react";
import * as twgl from "twgl.js";
import identityShader from "./identity.vert?raw";
import sourceShader from "./source.frag?raw";

type AnalysisData = {
  frequencyData: Uint8Array<ArrayBuffer>;
  waveformData: Uint8Array<ArrayBuffer>;
  pitchData: number[];
};

function App() {
  const contextRef = useRef<AudioContext | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const analyzerNodeRef = useRef<AnalyserNode | null>(null);
  const animationFrame = useRef<number>(0);
  const animationFrame2 = useRef<number>(0);
  const largeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceInitialized = useRef(false);
  const FFT_SIZE = 2048 * 4;

  const analysisData = useRef<AnalysisData>({
    frequencyData: new Uint8Array(FFT_SIZE / 2),
    pitchData: [0, 0, 0],
    waveformData: new Uint8Array(FFT_SIZE),
  });

  const initializeSource = () => {
    contextRef.current = new AudioContext();
    analyzerNodeRef.current = contextRef.current.createAnalyser();
    if (audioElementRef.current && contextRef) {
      const audioSource = contextRef.current.createMediaElementSource(
        audioElementRef.current,
      );

      analyzerNodeRef.current.fftSize = FFT_SIZE;

      audioSource.connect(analyzerNodeRef.current);
      audioSource.connect(contextRef.current.destination);
    }
  };

  useEffect(() => {
    const updateAnalysisData = () => {
      if (analyzerNodeRef.current && contextRef.current) {
        analyzerNodeRef.current.getByteFrequencyData(
          analysisData.current.frequencyData,
        );
        analyzerNodeRef.current.getByteFrequencyData(
          analysisData.current.waveformData,
        );

        let freqWindowSize =
          contextRef.current.sampleRate /
          2 /
          analyzerNodeRef.current.frequencyBinCount; // number of frequencies covered by each bin

        const getNearestIntensity = (frequency: number) => {
          return analysisData.current.frequencyData[
            Math.floor(frequency / freqWindowSize)
          ]; // the nth window to look at
        };

        const AVERAGE_RATIO = 0.02;

        analysisData.current.pitchData[0] =
          getNearestIntensity(131) * AVERAGE_RATIO +
          (1 - AVERAGE_RATIO) * analysisData.current.pitchData[0];
        analysisData.current.pitchData[1] =
          getNearestIntensity(92) * AVERAGE_RATIO +
          (1 - AVERAGE_RATIO) * analysisData.current.pitchData[1];
        analysisData.current.pitchData[2] =
          getNearestIntensity(120) * AVERAGE_RATIO +
          (1 - AVERAGE_RATIO) * analysisData.current.pitchData[2];
      }

      animationFrame.current = requestAnimationFrame(updateAnalysisData);
    };

    const drawBaseCanvas = () => {
      if (largeCanvasRef.current) {
        const gl = largeCanvasRef.current.getContext("webgl2")!;
        const programInfo = twgl.createProgramInfo(gl, [
          identityShader,
          sourceShader,
        ]);

        const baseQuadMesh = twgl.primitives.createXYQuadBufferInfo(gl);

        gl.useProgram(programInfo.program);
        twgl.setBuffersAndAttributes(gl, programInfo, baseQuadMesh);

        let time = 0;

        const render = () => {
          time += 1;
          twgl.resizeCanvasToDisplaySize(gl.canvas as HTMLCanvasElement);
          gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

          const uniforms = {
            uTime: time * 0.01,
            resolution: [gl.canvas.width, gl.canvas.height],
          };

          twgl.setUniforms(programInfo, uniforms);
          twgl.drawBufferInfo(gl, baseQuadMesh);
          animationFrame2.current = requestAnimationFrame(render);
        };

        render();
      }
    };

    drawBaseCanvas();

    // const drawFrequencyAndAmplitudeTest = () => {
    //   if (largeCanvasRef.current) {
    //     const ctx = largeCanvasRef.current.getContext("2d")!;
    //     const width = largeCanvasRef.current.width;
    //     const height = largeCanvasRef.current.width;
    //     const pitchData = analysisData.current.pitchData;

    //     ctx.clearRect(0, 0, width, height);

    //     const barWidth = Math.floor(width / pitchData.length);
    //     for (let i = 0; i < pitchData.length; i++) {
    //       const barHeight = Math.min(height, height * (pitchData[i] / 255));

    //       ctx.fillStyle =
    //         Math.abs(pitchData[0] - pitchData[1]) > 10 &&
    //         pitchData[0] > pitchData[1]
    //           ? "#ff0000"
    //           : "#00ff00";
    //       ctx.fillRect(i * barWidth, height - barHeight, barWidth, barHeight);
    //     }
    //   }

    //   animationFrame2.current = requestAnimationFrame(
    //     drawFrequencyAndAmplitudeTest,
    //   );
    // };

    updateAnalysisData();
    // drawFrequencyAndAmplitudeTest();

    return () => {
      cancelAnimationFrame(animationFrame.current);
      cancelAnimationFrame(animationFrame2.current);
    };
  }, []);

  return (
    <main className="w-full h-full min-h-screen flex items-center justify-center">
      <div className="w-124 flex flex-col gap-16 p-4 relative pt-48">
        <canvas
          className="absolute w-2xl h-84 bg-neutral-50 border border-neutral-300 rounded-xl top-0 left-1/2 -translate-x-1/2"
          ref={largeCanvasRef}
          width={400}
          height={200}
        ></canvas>
        <div className="w-56 h-56 bg-yellow-200 rounded-3xl flex flex-col p-4 gap-2 -translate-x-4">
          <div className="w-full flex gap-2">
            <p className="text-3xl">5</p>
            <div className="flex flex-col text-xs pt-1">
              <p>Dean Blunt</p>
              <p>Elias Rønnenfelt</p>
            </div>
          </div>
          <canvas className="w-full h-full bg-black rounded-lg"></canvas>
        </div>
        <audio
          src="five.mp3"
          className="w-full rounded-md"
          controls
          ref={audioElementRef}
          onPlay={() => {
            if (!sourceInitialized.current) {
              initializeSource();
              sourceInitialized.current = true;
            }
          }}
        ></audio>

        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
          <div className="w-full flex justify-between col-start-1 col-span-1">
            <label htmlFor="regrowth" className="w-full">
              Regrowth
            </label>
            <input
              type="number"
              className="bg-white border-2 border-neutral-200 rounded-sm w-8"
            />
          </div>
          <div className="w-full flex justify-between col-start-1 col-span-1 row-start-2">
            <label htmlFor="line-density" className="w-full">
              Line Density
            </label>
            <input
              type="number"
              className="bg-white border-2 border-neutral-200 rounded-sm w-8"
            />
          </div>
          <div className="w-full flex justify-between col-start-1 col-span-1 row-start-3">
            <label htmlFor="line-size" className="w-full">
              Line Size
            </label>
            <input
              type="number"
              className="bg-white border-2 border-neutral-200 rounded-sm w-8"
            />
          </div>
          <div className="w-full flex justify-between col-start-2 col-span-1 row-start-1">
            <label htmlFor="lacunarity" className="w-full">
              Lacunarity
            </label>
            <input
              type="number"
              className="bg-white border-2 border-neutral-200 rounded-sm w-8"
            />
          </div>
          <div className="w-full flex justify-between col-start-2 col-span-1 row-start-2">
            <label htmlFor="octaves" className="w-full">
              Octaves
            </label>
            <input
              type="number"
              className="bg-white border-2 border-neutral-200 rounded-sm w-8"
            />
          </div>
          <div className="w-full flex justify-between col-start-2 col-span-1 row-start-3">
            <label htmlFor="Gradient" className="w-full">
              Gradient
            </label>
            <input
              type="number"
              className="bg-white border-2 border-neutral-200 rounded-sm w-8"
            />
          </div>
        </div>
      </div>
    </main>
  );
}

export default App;
