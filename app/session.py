from typing import List, Dict, Any

class Session:
    def __init__(self):
        self.topic: str = ""
        self.subtopic: str = ""
        self.difficulty: int = 1
        self.conversation: List[Dict[str, str]] = []
        self.asked_questions: List[str] = []
        self.knowledge: Dict[str, Any] = {}
        self.communication: Dict[str, Any] = {
            "confidence": [],
            "clarity": [],
            "pauses": 0,
            "filler_words": 0,
            "pace": []
        }
        self.remaining_time: int = 600

    def get_state(self) -> dict:
        return {
            "topic": self.topic,
            "subtopic": self.subtopic,
            "difficulty": self.difficulty,
            "conversation": self.conversation,
            "asked_questions": self.asked_questions,
            "knowledge": self.knowledge,
            "communication": self.communication,
            "remaining_time": self.remaining_time
        }
