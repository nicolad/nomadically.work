"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Flex, Button, Text } from "@radix-ui/themes";

interface ExerciseTimerProps {
  durationMinutes?: number;
}

export function ExerciseTimer({ durationMinutes = 10 }: ExerciseTimerProps) {
  const totalSeconds = durationMinutes * 60;
  const [remaining, setRemaining] = useState(totalSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return clear;
  }, [running, clear]);

  // Separate effect to handle timer completion
  useEffect(() => {
    if (remaining === 0 && running) {
      setRunning(false);
    }
  }, [remaining, running]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const pct = (remaining / totalSeconds) * 100;

  const urgency: "green" | "orange" | "red" =
    pct > 50 ? "green" : pct > 20 ? "orange" : "red";

  return (
    <Flex align="center" gap="3">
      <Text
        size="6"
        weight="bold"
        style={{
          fontVariantNumeric: "tabular-nums",
          color: `var(--${urgency}-11)`,
        }}
      >
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </Text>

      <Flex gap="2">
        {!running ? (
          <Button
            size="1"
            variant="soft"
            onClick={() => {
              if (remaining === 0) setRemaining(totalSeconds);
              setRunning(true);
            }}
          >
            {remaining === totalSeconds ? "Start" : "Resume"}
          </Button>
        ) : (
          <Button
            size="1"
            variant="soft"
            color="orange"
            onClick={() => setRunning(false)}
          >
            Pause
          </Button>
        )}
        <Button
          size="1"
          variant="ghost"
          onClick={() => {
            clear();
            setRunning(false);
            setRemaining(totalSeconds);
          }}
        >
          Reset
        </Button>
      </Flex>
    </Flex>
  );
}
