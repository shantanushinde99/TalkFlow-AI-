"""In-memory interview state. Lives for one LiveKit job only; nothing is persisted."""
import re
from dataclasses import dataclass, field

SESSION_SECONDS = 600
LONG_PAUSE_SECONDS = 4.0
_FILLERS = re.compile(r"\b(?:um+|uh+|erm+|hmm+|you know|i mean|sort of|kind of|basically)\b", re.I)


@dataclass
class Session:
    """Topic, transcript and speaking metrics for the current interview."""

    topic: str = ""
    conversation: list[dict[str, str]] = field(default_factory=list)
    remaining_time: int = SESSION_SECONDS
    words: int = 0
    filler_words: int = 0
    speaking_seconds: float = 0.0
    long_pauses: int = 0
    _speech_started: float | None = None
    _listening_since: float | None = None

    def add_user_text(self, text: str) -> None:
        """Count words and filler words in a final user transcript."""
        self.words += len(text.split())
        self.filler_words += len(_FILLERS.findall(text))

    def agent_listening(self, now: float) -> None:
        """The interviewer finished speaking; start timing the user's response delay."""
        self._listening_since = now

    def user_speaking(self, now: float) -> None:
        if self._listening_since is not None and now - self._listening_since > LONG_PAUSE_SECONDS:
            self.long_pauses += 1
        self._listening_since = None
        self._speech_started = now

    def user_stopped(self, now: float) -> None:
        if self._speech_started is not None:
            self.speaking_seconds += now - self._speech_started
            self._speech_started = None

    def metrics_summary(self) -> str:
        """Plain-text speaking metrics for the evaluation prompt."""
        wpm = round(self.words / (self.speaking_seconds / 60)) if self.speaking_seconds > 5 else 0
        return (
            f"- Words spoken: {self.words}\n"
            f"- Speaking pace: {wpm or 'n/a'} words per minute (typical conversational pace is 120-160)\n"
            f"- Filler words (um, uh, you know, ...): {self.filler_words}\n"
            f"- Long pauses before answering (>{LONG_PAUSE_SECONDS:.0f}s): {self.long_pauses}"
        )


if __name__ == "__main__":
    s = Session()
    s.add_user_text("Um so basically a transformer uses, uh, self attention. You know?")
    assert (s.words, s.filler_words) == (11, 4), (s.words, s.filler_words)
    s.agent_listening(0.0)
    s.user_speaking(5.0)
    s.user_stopped(35.0)
    assert s.long_pauses == 1 and s.speaking_seconds == 30.0
    assert "22 words per minute" in s.metrics_summary()
    print("ok")
