import React, { useState, useEffect } from "react";
import { render, Text, Box, useStdout } from "ink";

// Sample multi-line response with 500+ characters to test streaming
const SAMPLE_RESPONSE = `Here's an example of a streaming LLM response that demonstrates multi-line text with word wrapping capabilities.

This response includes multiple paragraphs to test how Ink handles:
- Line breaks and newlines
- Word wrapping at terminal boundaries
- Rapid state updates without flicker
- Long continuous text that needs to wrap

The quick brown fox jumps over the lazy dog. This pangram contains every letter of the alphabet and is useful for testing text rendering. We repeat it to ensure we exceed 500 characters for the success criteria.

Additional text to ensure we have enough content for a thorough test of the streaming behavior. The rendering should remain smooth even with frequent updates at 50ms intervals.`;

interface StreamingTextProps {
  fullText: string;
  intervalMs?: number;
}

function StreamingText({ fullText, intervalMs }: StreamingTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [charIndex, setCharIndex] = useState(0);
  const [startTime] = useState(Date.now());
  const [endTime, setEndTime] = useState<number | null>(null);

  useEffect(() => {
    if (charIndex >= fullText.length) {
      if (!endTime) {
        setEndTime(Date.now());
      }
      return;
    }

    const timer = setTimeout(() => {
      setDisplayedText(fullText.slice(0, charIndex + 1));
      setCharIndex((prev) => prev + 1);
    }, intervalMs);

    return () => clearTimeout(timer);
  }, [charIndex, fullText, intervalMs, endTime]);

  const elapsed = endTime ? endTime - startTime : Date.now() - startTime;
  const isComplete = charIndex >= fullText.length;

  return (
    <Box flexDirection="column" width="100%">
      <Box marginBottom={1}>
        <Text color="cyan">
          Streaming Test: {charIndex}/{fullText.length} chars | {elapsed}ms
          elapsed {isComplete ? "✓ Complete" : "..."}
        </Text>
      </Box>
      <Box borderStyle="single" paddingX={1}>
        <Text wrap="wrap">{displayedText}</Text>
      </Box>
      {isComplete && (
        <Box marginTop={1}>
          <Text color="green">
            Success: Rendered {fullText.length} characters in {elapsed}ms
          </Text>
        </Box>
      )}
    </Box>
  );
}

function App() {
  const { stdout } = useStdout();
  const width = stdout?.columns ?? 80;

  return (
    <Box flexDirection="column" width={width}>
      <Box marginBottom={1}>
        <Text bold color="yellow">
          Ink + Streaming LLM Response Spike
        </Text>
      </Box>
      <Text dimColor>Terminal width: {width} columns</Text>
      <Box marginTop={1}>
        <StreamingText fullText={SAMPLE_RESPONSE} intervalMs={16} />
      </Box>
    </Box>
  );
}

render(<App />);
