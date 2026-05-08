import { useCallback, useRef, useState } from "react";
import { supabase } from "../config/supabase";

export interface UseWhisperInput {
  recording: boolean;
  transcribing: boolean;
  error: string | null;
  startRecording: () => Promise<void>;
  stopAndTranscribe: () => Promise<string | null>;
}

const MIC_PERMISSION_ERROR =
  "Microphone access needed. Check your browser settings.";
const NO_AUDIO_ERROR = "No audio detected. Try again.";
const TRANSCRIBE_ERROR = "Couldn't transcribe that. Type your answer instead.";

function pickMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/mpeg",
  ];

  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return "";
}

function extensionForMime(mimeType: string): string {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("mpeg")) return "mp3";
  return "webm";
}

export function useWhisperInput(): UseWhisperInput {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(MIC_PERMISSION_ERROR);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        cleanupStream();
      };

      recorder.start();
      setRecording(true);
    } catch (err: any) {
      cleanupStream();
      recorderRef.current = null;
      setRecording(false);

      const permissionDenied =
        err?.name === "NotAllowedError" ||
        err?.name === "PermissionDeniedError" ||
        err?.message?.toLowerCase?.().includes?.("permission");

      setError(permissionDenied ? MIC_PERMISSION_ERROR : MIC_PERMISSION_ERROR);
    }
  }, [cleanupStream]);

  const stopAndTranscribe = useCallback(async (): Promise<string | null> => {
    setError(null);

    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      setRecording(false);
      setError(NO_AUDIO_ERROR);
      return null;
    }

    setRecording(false);
    setTranscribing(true);

    try {
      const stopped = new Promise<void>((resolve) => {
        recorder.addEventListener("stop", () => resolve(), { once: true });
      });

      recorder.stop();
      await stopped;

      const mimeType = recorder.mimeType || "audio/webm";
      const audioBlob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];
      recorderRef.current = null;

      if (!audioBlob.size) {
        setError(NO_AUDIO_ERROR);
        return null;
      }

      const formData = new FormData();
      const ext = extensionForMime(mimeType);
      formData.append("file", audioBlob, `recording.${ext}`);

      const { data, error: invokeError } = await supabase.functions.invoke("transcribe", {
        body: formData,
      });

      if (invokeError || !data?.transcript || typeof data.transcript !== "string") {
        setError(TRANSCRIBE_ERROR);
        return null;
      }

      const transcript = data.transcript.trim();
      if (!transcript) {
        setError(NO_AUDIO_ERROR);
        return null;
      }

      return transcript;
    } catch {
      setError(TRANSCRIBE_ERROR);
      return null;
    } finally {
      setTranscribing(false);
      cleanupStream();
    }
  }, [cleanupStream]);

  return {
    recording,
    transcribing,
    error,
    startRecording,
    stopAndTranscribe,
  };
}
