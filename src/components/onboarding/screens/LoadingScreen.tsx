import { useEffect, useRef, useState } from "react";
import { consumePendingIcpRegenerateNudge } from "../../../lib/icpPersonaCap";
import { AnimatePresence, motion } from "../../../lib/motion";
import { getAllProfileImages } from "../../../config/profileImages";

interface LoadingScreenProps {
  onComplete?: () => void;
  /**
   * Optional async job to run once on mount.
   * Use this for the ICP generation pipeline (Option B).
   */
  run?: () => Promise<void>;
  /**
   * Optional async job (preferred name) to run once on mount.
   * Kept for backwards compatibility in case props change.
   */
  runJob?: () => Promise<void>;
}

const loadingStages = [
  "Analyzing your target market...",
  "Mapping motivations and buying triggers...",
  "Identifying pain points and desires...",
  "Defining demographic patterns...",
  "Synthesizing behavioral insights...",
  "Crafting psychological profile...",
  "Finalizing your Ideal Customer Profile...",
];

const maleLoadingAvatars = [
  "/images/avatars/male/18-24/male_18-24_002.png",
  "/images/avatars/male/25-34/male_25-34_001.png",
  "/images/avatars/male/35-44/male_35-44_001.png",
  "/images/avatars/male/45-54/male_45-54_002.png",
];

export function LoadingScreen({ onComplete, run, runJob }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [currentAvatarIndex, setCurrentAvatarIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const startedRef = useRef(false);
  const [jobDone, setJobDone] = useState(false);
  const progressIntervalRef = useRef<number | null>(null);
  const stageIntervalRef = useRef<number | null>(null);
  const avatarIntervalRef = useRef<number | null>(null);
  const completionTimeoutRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const avatarLibrary = getAllProfileImages();
  const avatars = Array.from(
    new Set(
      [
        ...avatarLibrary,
        ...maleLoadingAvatars,
      ].filter(Boolean)
    )
  );
  const fallbackAvatar = "/images/profiles/ld1.png";

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (progressIntervalRef.current !== null) {
        window.clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (stageIntervalRef.current !== null) {
        window.clearInterval(stageIntervalRef.current);
        stageIntervalRef.current = null;
      }
      if (avatarIntervalRef.current !== null) {
        window.clearInterval(avatarIntervalRef.current);
        avatarIntervalRef.current = null;
      }
      if (completionTimeoutRef.current !== null) {
        window.clearTimeout(completionTimeoutRef.current);
        completionTimeoutRef.current = null;
      }
    };
  }, []);

  const pickNextAvatarIndex = (prev: number) => {
    if (avatars.length <= 1) return 0;
    let next = prev;
    let guard = 0;
    while (next === prev && guard < 8) {
      next = Math.floor(Math.random() * avatars.length);
      guard += 1;
    }
    return next;
  };

  useEffect(() => {
    const hasJob = Boolean(run || runJob);
    if (progressIntervalRef.current !== null) {
      window.clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    progressIntervalRef.current = window.setInterval(() => {
      if (!mountedRef.current) return;
      setProgress((prev) => {
        const cap = hasJob && !jobDone ? 90 : 100;
        if (prev >= cap) return prev;
        return prev + 1;
      });
    }, 80);

    return () => {
      if (progressIntervalRef.current !== null) {
        window.clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [run, runJob, jobDone]);

  useEffect(() => {
    if (stageIntervalRef.current !== null) {
      window.clearInterval(stageIntervalRef.current);
      stageIntervalRef.current = null;
    }
    stageIntervalRef.current = window.setInterval(() => {
      if (!mountedRef.current) return;
      setCurrentStageIndex((prev) => {
        if (loadingStages.length <= 1) return 0;
        return (prev + 1) % loadingStages.length;
      });
    }, 2000);

    return () => {
      if (stageIntervalRef.current !== null) {
        window.clearInterval(stageIntervalRef.current);
        stageIntervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (avatarIntervalRef.current !== null) {
      window.clearInterval(avatarIntervalRef.current);
      avatarIntervalRef.current = null;
    }
    if (jobDone) return;
    avatarIntervalRef.current = window.setInterval(() => {
      if (!mountedRef.current) return;
      setCurrentAvatarIndex((prev) => pickNextAvatarIndex(prev));
    }, 1200);

    return () => {
      if (avatarIntervalRef.current !== null) {
        window.clearInterval(avatarIntervalRef.current);
        avatarIntervalRef.current = null;
      }
    };
  }, [avatars.length, jobDone]);

  useEffect(() => {
    const job = run || runJob;
    if (!job || startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;

    const runOnce = async () => {
      try {
        await job();
        if (cancelled || !mountedRef.current) return;
        const nudge = consumePendingIcpRegenerateNudge();
        if (nudge) {
          setInfoMessage(nudge);
          await new Promise((resolve) => window.setTimeout(resolve, 2200));
        }
        if (cancelled || !mountedRef.current) return;
        setJobDone(true);
        setProgress(100);
        if (avatarIntervalRef.current !== null) {
          window.clearInterval(avatarIntervalRef.current);
          avatarIntervalRef.current = null;
        }
        if (stageIntervalRef.current !== null) {
          window.clearInterval(stageIntervalRef.current);
          stageIntervalRef.current = null;
        }
        if (progressIntervalRef.current !== null) {
          window.clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        if (onComplete) {
          if (completionTimeoutRef.current !== null) {
            window.clearTimeout(completionTimeoutRef.current);
          }
          // Exit immediately once generation is ready.
          completionTimeoutRef.current = window.setTimeout(onComplete, 100);
        }
      } catch (e: any) {
        if (cancelled || !mountedRef.current) return;
        console.error("[LoadingScreen] run failed", e);
        setError(e?.message || "Something went wrong while generating your ICP.");
      }
    };

    runOnce();
    return () => {
      cancelled = true;
    };
  }, [run, runJob, onComplete]);

  useEffect(() => {
    const job = run || runJob;
    if (!job && progress >= 100 && onComplete) {
      if (completionTimeoutRef.current !== null) {
        window.clearTimeout(completionTimeoutRef.current);
      }
      completionTimeoutRef.current = window.setTimeout(onComplete, 500);
      return () => {
        if (completionTimeoutRef.current !== null) {
          window.clearTimeout(completionTimeoutRef.current);
          completionTimeoutRef.current = null;
        }
      };
    }
    return undefined;
  }, [progress, onComplete, run, runJob]);

  return (
    <div className="w-full min-h-[500px] flex items-center justify-center bg-white overflow-hidden">
      <div className="relative flex flex-col items-center gap-10 px-4 py-10">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-3xl sm:text-4xl md:text-5xl text-center max-w-3xl font-['Fraunces'] font-bold"
        >
          Building your
          <br />
          ideal customer...
        </motion.h1>

        <div className="relative">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(134, 239, 172, 0.3) 0%, transparent 70%)",
              filter: "blur(20px)",
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {[0, 1, 2, 3, 4, 5].map((i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-green-400 rounded-full"
              style={{
                left: "50%",
                top: "50%",
              }}
              animate={{
                x: [0, Math.cos((i * Math.PI) / 3) * 180, 0],
                y: [0, Math.sin((i * Math.PI) / 3) * 180, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "linear",
                delay: i * 0.3,
              }}
            />
          ))}

          <motion.div
            className="relative w-56 h-56 sm:w-64 sm:h-64 md:w-80 md:h-80 rounded-full overflow-hidden border-4 border-gray-200 shadow-2xl bg-white"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {(avatars.length > 0 || fallbackAvatar) && (
              <img
                src={avatars[currentAvatarIndex] || fallbackAvatar}
                alt="ICP avatar"
                className="w-full h-full object-cover"
              />
            )}

            <motion.div
              className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-loading-scan"
              style={{
                boxShadow: "0 0 20px rgba(134, 239, 172, 0.8)",
              }}
            />

            <motion.div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(134, 239, 172, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(134, 239, 172, 0.1) 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
              animate={{
                opacity: [0, 0.3, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />
          </motion.div>

        </div>

        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-3 h-3 bg-green-300 rounded-full"
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>

        <div className="h-8 flex items-center justify-center text-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentStageIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-base sm:text-lg text-gray-600 font-['Inter']"
            >
              {loadingStages[currentStageIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {infoMessage && !error && (
          <p className="max-w-xl text-center text-sm text-foreground/65 font-['Inter'] px-4">
            {infoMessage}
          </p>
        )}

        {error && (
          <div className="max-w-xl border border-black rounded-design bg-white p-4 text-left">
            <p className="font-['Fraunces'] text-lg mb-2">
              Hmm - something went wrong
            </p>
            <p className="font-['Inter'] text-sm text-foreground/70">
              {error}
            </p>
            <p className="font-['Inter'] text-xs text-foreground/60 mt-2">
              Tip: check your .env.local values and restart <code>npm run dev</code>.
            </p>
          </div>
        )}

        <div className="w-full max-w-md">
          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-[width] duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
            <div className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white to-transparent opacity-50 animate-loading-shimmer" />
          </div>
          <motion.p
            className="text-center mt-2 text-gray-500 font-['Inter']"
            key={progress}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
          >
            {progress}%
          </motion.p>
        </div>
      </div>
    </div>
  );
}
