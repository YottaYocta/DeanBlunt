import { useEffect, useRef } from "react";
import * as twgl from "twgl.js";
import identityShader from "./identity.vert?raw";
import daffodilShader from "./daffodils.frag?raw";
import waveformShader from "./waveform.frag?raw";
import elias from "./elias.png";

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
  const animationFrame3 = useRef<number>(0);
  const largeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const smallCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceInitialized = useRef(false);
  const FFT_SIZE = 2048 * 4;
  const mousePosition = useRef<[number, number]>([0.5, 0.5]);
  const mouseEased = useRef<[number, number]>([0.5, 0.5]);
  const mouseDown = useRef<[boolean, number]>([false, 0]);

  const analysisData = useRef<AnalysisData>({
    frequencyData: new Uint8Array(FFT_SIZE / 2),
    pitchData: [0, 0, 0, 0], // c, f#, b, higher reigister average
    waveformData: new Uint8Array(FFT_SIZE),
  });

  const lerp = (a: number, b: number, c: number) => {
    return a * (1 - c) + c * b;
  };

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

        const AVERAGE_RATIO = 0.01;

        analysisData.current.pitchData[0] =
          getNearestIntensity(131) * AVERAGE_RATIO +
          (1 - AVERAGE_RATIO) * analysisData.current.pitchData[0];
        analysisData.current.pitchData[1] =
          getNearestIntensity(92) * AVERAGE_RATIO +
          (1 - AVERAGE_RATIO) * analysisData.current.pitchData[1];
        analysisData.current.pitchData[2] =
          getNearestIntensity(120) * AVERAGE_RATIO +
          (1 - AVERAGE_RATIO) * analysisData.current.pitchData[2];
        analysisData.current.pitchData[3] *= 0.7;
        analysisData.current.pitchData[3] +=
          ((getNearestIntensity(4000) +
            getNearestIntensity(8000) +
            getNearestIntensity(16000)) /
            (255 * 3)) *
          0.3;
      }

      animationFrame.current = requestAnimationFrame(updateAnalysisData);
    };

    const drawBaseCanvas = () => {
      if (largeCanvasRef.current) {
        const gl = largeCanvasRef.current.getContext("webgl2")!;
        const programInfo = twgl.createProgramInfo(gl, [
          identityShader,
          daffodilShader,
        ]);

        const baseQuadMesh = twgl.primitives.createXYQuadBufferInfo(gl);

        gl.useProgram(programInfo.program);
        twgl.setBuffersAndAttributes(gl, programInfo, baseQuadMesh);

        let time = 0;

        const render = () => {
          time += 1;
          twgl.resizeCanvasToDisplaySize(gl.canvas as HTMLCanvasElement);
          gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
          mouseEased.current[0] = lerp(
            mouseEased.current[0],
            mousePosition.current[0],
            0.05,
          );
          mouseEased.current[1] = lerp(mouseEased.current[1], 1, 0.05);
          mouseDown.current[1] = lerp(
            mouseDown.current[1],
            mouseDown.current[0] ? 1 : 0,
            mouseDown.current[0] ? 0.01 : 0.05,
          );

          const uniforms = {
            uTime: time * 0.01,
            uResolution: [gl.canvas.width, gl.canvas.height],
            uNotes: [
              analysisData.current.pitchData[0] / 255,
              analysisData.current.pitchData[1] / 255,
              analysisData.current.pitchData[2] / 255,
            ],
            uMouse: mouseEased.current,
            uMouseDown: mouseDown.current[1],
          };

          twgl.setUniforms(programInfo, uniforms);
          twgl.drawBufferInfo(gl, baseQuadMesh);
          animationFrame2.current = requestAnimationFrame(render);
        };

        render();
      }
    };

    const drawSmallerCanvas = () => {
      if (smallCanvasRef.current) {
        const gl = smallCanvasRef.current.getContext("webgl2")!;
        const programInfo = twgl.createProgramInfo(gl, [
          identityShader,
          waveformShader,
        ]);

        const baseQuadMesh = twgl.primitives.createXYQuadBufferInfo(gl);

        gl.useProgram(programInfo.program);
        twgl.setBuffersAndAttributes(gl, programInfo, baseQuadMesh);
        const eliasTexture = twgl.createTexture(gl, { src: elias });

        let time = 0;
        const render = () => {
          time += 1;
          twgl.resizeCanvasToDisplaySize(gl.canvas as HTMLCanvasElement);
          gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

          const uniforms = {
            uTime: time * 0.01,
            uResolution: [gl.canvas.width, gl.canvas.height],
            uMouse: mouseEased.current,
            uRotation: Math.PI / 4,
            uDensity: 30,
            uThreshold: 1.0,
            uLineColor: [0, 0, 0, 1],
            uAmplitude: analysisData.current.pitchData[3],
            tElias: eliasTexture,
          };

          twgl.setUniforms(programInfo, uniforms);
          twgl.drawBufferInfo(gl, baseQuadMesh);
          animationFrame3.current = requestAnimationFrame(render);
        };

        render();
      }
    };

    drawBaseCanvas();
    drawSmallerCanvas();
    updateAnalysisData();

    return () => {
      cancelAnimationFrame(animationFrame.current);
      cancelAnimationFrame(animationFrame2.current);
      cancelAnimationFrame(animationFrame3.current);
    };
  }, []);

  return (
    <main className="w-full h-full min-h-screen flex items-center justify-center">
      <div className="w-124 flex flex-col gap-16 p-4 relative pt-48">
        <canvas
          className="absolute w-2xl h-84 bg-neutral-50 border border-neutral-500 rounded-md top-0 left-1/2 -translate-x-1/2 cursor-pointer"
          onMouseDown={() => {
            mouseDown.current[0] = true;
          }}
          onMouseUp={() => {
            mouseDown.current[0] = false;
          }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();

            mousePosition.current[0] = (e.clientX - rect.left) / rect.width;
            mousePosition.current[1] = (e.clientY - rect.top) / rect.height;
            mouseEased.current[1] = lerp(
              mouseEased.current[1],
              mousePosition.current[1],
              0.01,
            );
          }}
          ref={largeCanvasRef}
          width={320}
          height={160}
        />

        <div className="w-56 h-56 bg-[#fffb00] flex flex-col p-2 gap-2 -translate-x-4 border border-[#ddd207] pointer-events-none rounded-md">
          <div className="w-full flex gap-2 p-2 text-black">
            <p className="text-3xl">5</p>
            <div className="flex flex-col text-xs pt-1">
              <p>Dean Blunt</p>
              <p>Elias Rønnenfelt</p>
            </div>
          </div>
          <canvas className="w-full h-full " ref={smallCanvasRef}></canvas>
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
        {/* 
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
        </div> */}
      </div>
    </main>
  );
}

export default App;
