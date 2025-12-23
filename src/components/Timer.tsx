import { createSignal, onMount, onCleanup, createMemo } from "solid-js";
import { Icon } from "@iconify-icon/solid";

export default function Timer() {
  const TOTAL_TIME = 10 * 60; // 10 minutes in seconds
  const INTRO_DURATION = 120; // 2 minutes intro

  // State
  const [timeRemaining, setTimeRemaining] = createSignal(TOTAL_TIME);
  const [isRunning, setIsRunning] = createSignal(false);
  const [timerStarted, setTimerStarted] = createSignal(false);
  const [statusMessage, setStatusMessage] = createSignal("");

  let audioRef: HTMLAudioElement | undefined;
  let intervalId: number | undefined;

  const displayText = createMemo(() => {
    if (!timerStarted()) {
      return "";
    }
    const minutes = Math.floor(timeRemaining() / 60);
    const seconds = timeRemaining() % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  });

  const isLowTime = createMemo(() => timeRemaining() <= 120);

  const progressPercentage = createMemo(() => {
    if (!timerStarted()) return 0;
    return ((TOTAL_TIME - timeRemaining()) / TOTAL_TIME) * 100;
  });

  // Timer tick function
  const tick = () => {
    setTimeRemaining((prev) => {
      if (prev > 0) {
        return prev - 1;
      } else {
        // Timer complete, reset for next loop
        setStatusMessage("Timer reset - continuing mission...");
        return TOTAL_TIME;
      }
    });
  };

  // Audio sync function
  const syncWithAudio = () => {
    if (!audioRef || !isRunning()) return;

    // Check if audio has looped back to beginning
    if (timerStarted() && audioRef.currentTime < 5) {
      onAudioLoop();
      return;
    }

    // Start the timer countdown when we hit 2 minutes
    if (
      audioRef.currentTime >= INTRO_DURATION &&
      !intervalId &&
      !timerStarted()
    ) {
      intervalId = setInterval(tick, 1000) as unknown as number;
      setTimerStarted(true);
      setStatusMessage("In progress");
    }

    // Sync timer with audio after intro
    if (audioRef.currentTime >= INTRO_DURATION && intervalId) {
      const audioProgress = audioRef.currentTime - INTRO_DURATION;
      const expectedTimerTime = TOTAL_TIME - (audioProgress % TOTAL_TIME);

      // Only sync if there's a significant difference (more than 2 seconds)
      if (Math.abs(timeRemaining() - expectedTimerTime) > 2) {
        setTimeRemaining(Math.max(0, Math.floor(expectedTimerTime)));
      }
    }
  };

  // Audio loop handler
  const onAudioLoop = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = undefined;
    }
    setTimerStarted(false);
    setTimeRemaining(TOTAL_TIME);
    setStatusMessage("In progress");
  };

  // Control handlers
  const handlePlayPause = async () => {
    if (!audioRef) return;

    if (isRunning()) {
      // Pause
      setIsRunning(false);
      audioRef.pause();
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
      setStatusMessage("Paused");
    } else {
      // Play or Resume
      setIsRunning(true);

      // If this is the first play, start from beginning
      if (!timerStarted() && audioRef.currentTime === 0) {
        audioRef.currentTime = 0;
      }

      try {
        await audioRef.play();

        // If timer was already started, restart the interval
        if (timerStarted()) {
          intervalId = setInterval(tick, 1000) as unknown as number;
          setStatusMessage("Resumed");
        } else {
          setStatusMessage("In progress");
        }
      } catch (error) {
        console.error("Audio playback failed:", error);
        setStatusMessage("Click Play again to enable audio");
        setIsRunning(false);
      }
    }
  };

  const handleReset = () => {
    if (!audioRef) return;

    setIsRunning(false);
    audioRef.pause();
    audioRef.currentTime = 0;

    if (intervalId) {
      clearInterval(intervalId);
      intervalId = undefined;
    }

    setTimeRemaining(TOTAL_TIME);
    setTimerStarted(false);
    setStatusMessage("Ready to begin");
  };

  const handleTimeJump = (minutes: number) => {
    if (!audioRef) return;

    // Calculate the audio time: intro (120s) + elapsed time
    const elapsedTime = TOTAL_TIME - minutes * 60;
    const audioTime = INTRO_DURATION + elapsedTime;

    audioRef.currentTime = audioTime;
    setTimeRemaining(minutes * 60);
    setTimerStarted(true);

    // If not running, start it
    if (!isRunning()) {
      setIsRunning(true);
      audioRef.play().catch((error) => {
        console.error("Audio playback failed:", error);
        setIsRunning(false);
      });
      intervalId = setInterval(tick, 1000) as unknown as number;
    }

    setStatusMessage(`Jumped to ${minutes}:00`);
  };

  // Setup and cleanup
  onMount(() => {
    if (audioRef) {
      audioRef.addEventListener("timeupdate", syncWithAudio);
      audioRef.addEventListener("ended", onAudioLoop);
    }
  });

  onCleanup(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
    if (audioRef) {
      audioRef.removeEventListener("timeupdate", syncWithAudio);
      audioRef.removeEventListener("ended", onAudioLoop);
    }
  });

  return (
    <div
      style={{
        display: "flex",
        "flex-direction": "column",
        "align-items": "center",
        gap: "1rem",
      }}
    >
      <div
        class="display"
        style={{
          "font-size": "6rem",
          color: "var(--foreground)",
          margin: "0.5rem",
          padding: "0.5rem",
          "text-shadow": "0 0 10px var(--text-shadow)",
        }}
      >
        {displayText()}
      </div>
      <div
        style={{
          display: "flex",
          gap: "15px",
          "justify-content": "center",
          "margin-top": "2rem",
        }}
      >
        {!isRunning() ? (
          <button
            onClick={handlePlayPause}
            style={{
              display: "flex",
              "align-items": "center",
              gap: "8px",
            }}
          >
            <Icon icon="pixelarticons:play" width="24" height="24" />
            <span>Play</span>
          </button>
        ) : (
          <button
            onClick={handlePlayPause}
            style={{
              display: "flex",
              "align-items": "center",
              gap: "8px",
            }}
          >
            <Icon icon="pixelarticons:pause" width="24" height="24" />
            <span>Pause</span>
          </button>
        )}
        <button
          onClick={handleReset}
          style={{
            display: "flex",
            "align-items": "center",
            gap: "8px",
          }}
        >
          <Icon icon="pixelarticons:reload" width="24" height="24" />
          <span>Reset</span>
        </button>
      </div>

      <div
        style={{
          width: "100%",
          height: "20px",
          border: "2px solid var(--accent)",
          overflow: "hidden",
          "margin-top": "20px",
          background: "var(--background)",
        }}
      >
        <div
          style={{
            width: `${progressPercentage()}%`,
            height: "100%",
            background: isLowTime()
              ? "repeating-linear-gradient(90deg, #ff0000 0px, #ff0000 10px, #cc0000 10px, #cc0000 20px)"
              : "repeating-linear-gradient(90deg, var(--accent) 0px, var(--accent) 10px, color-mix(in srgb, var(--accent) 80%, transparent) 10px, color-mix(in srgb, var(--accent) 80%, transparent) 20px)",
            transition: "width 0.3s ease, background 0.3s ease",
            "box-shadow": isLowTime()
              ? "0 0 10px #ff0000"
              : "0 0 10px var(--accent)",
          }}
        />
      </div>

      <div style={{ "margin-top": "1rem" }}>{statusMessage()}</div>

      {/* Testing controls - only in development */}
      {import.meta.env.DEV && (
        <details style={{ "margin-top": "2rem", width: "100%" }}>
          <summary
            style={{
              cursor: "pointer",
              padding: "0.5rem",
              border: "1px solid var(--accent)",
              background: "var(--background)",
              "text-align": "center",
            }}
          >
            Local Dev Testing: Jump to Time
          </summary>
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              "flex-wrap": "wrap",
              "justify-content": "center",
              padding: "1rem",
              border: "1px solid var(--accent)",
              "border-top": "none",
              background: "var(--background)",
            }}
          >
            <button onClick={() => handleTimeJump(10)}>10:00</button>
            <button onClick={() => handleTimeJump(9)}>9:00</button>
            <button onClick={() => handleTimeJump(8)}>8:00</button>
            <button onClick={() => handleTimeJump(7)}>7:00</button>
            <button onClick={() => handleTimeJump(6)}>6:00</button>
            <button onClick={() => handleTimeJump(5)}>5:00</button>
            <button onClick={() => handleTimeJump(4)}>4:00</button>
            <button onClick={() => handleTimeJump(3)}>3:00</button>
            <button onClick={() => handleTimeJump(2)}>2:00</button>
            <button onClick={() => handleTimeJump(1)}>1:00</button>
            <button onClick={() => handleTimeJump(0)}>0:00</button>
          </div>
        </details>
      )}

      <audio ref={audioRef} loop>
        <source
          src={`${import.meta.env.BASE_URL}/DecagoneTimer.mp3`}
          type="audio/mpeg"
        />
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}
