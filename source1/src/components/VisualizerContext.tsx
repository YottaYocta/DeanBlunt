/**
 * vis interface should contain audio context, a way to set audio source ref, and values for current
 */

import { createContext, useContext, type Ref, type RefObject } from "react";

interface AudioAnalyzerComponentProps {
  currentFrequencyData: Uint8Array;
  currentTimeDomainData: Uint8Array;
  setAudioSource: (source: HTMLAudioElement) => void;
}

export const useAudioAnalyzer = createContext<AudioAnalyzerComponentProps>({
  currentFrequencyData: new Uint8Array(),
  currentTimeDomainData: new Uint8Array(),
  setAudioSource: () => {},
});
