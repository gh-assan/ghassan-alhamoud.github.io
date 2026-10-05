"""Pure teaching model for speech relevance; no I/O, auth or task execution.

Application code constructs verified inputs. PLAY is a decision, not an audio
side effect. Production code must fence the player enqueue in the same owner.
"""

from dataclasses import dataclass
from enum import Enum
from types import MappingProxyType
from typing import Mapping


class Decision(str, Enum):
    """Presentation decision returned to the owning scheduler."""

    DROP = "drop"
    WAIT = "wait"
    PLAY = "play"


def _counter(value: int, name: str) -> None:
    if type(value) is not int or value < 0:
        raise ValueError(f"{name} must be a nonnegative integer")


@dataclass(frozen=True)
class View:
    """Immutable, trusted session projection including every relevant request."""

    owner_epoch: int
    generation: int
    request_revisions: Mapping[str, int]
    user_speaking: bool = False
    assistant_playing: bool = False
    access_epoch: int = 0

    def __post_init__(self) -> None:
        _counter(self.owner_epoch, "owner_epoch")
        _counter(self.generation, "generation")
        _counter(self.access_epoch, "access_epoch")
        for field in (self.user_speaking, self.assistant_playing):
            if type(field) is not bool:
                raise ValueError("speech activity flags must be boolean")
        revisions = dict(self.request_revisions)
        for request_id, revision in revisions.items():
            if not isinstance(request_id, str) or not request_id.strip():
                raise ValueError("request IDs must be nonempty strings")
            _counter(revision, "revision")
        object.__setattr__(self, "request_revisions", MappingProxyType(revisions))


@dataclass(frozen=True)
class SpeechItem:
    """Verified candidate output tied to one request and playback generation."""

    owner_epoch: int
    generation: int
    request_id: str
    revision: int
    grounded: bool
    access_epoch: int = 0

    def __post_init__(self) -> None:
        for name in ("owner_epoch", "generation", "revision", "access_epoch"):
            _counter(getattr(self, name), name)
        if not isinstance(self.request_id, str) or not self.request_id.strip():
            raise ValueError("request_id must be a nonempty string")
        if type(self.grounded) is not bool:
            raise ValueError("grounded must be an application-verified boolean")


def decide_output(current: View, item: SpeechItem) -> Decision:
    """Reject stale output before considering whether the floor is available."""
    if item.owner_epoch != current.owner_epoch:
        return Decision.DROP
    if item.generation != current.generation:
        return Decision.DROP
    if item.access_epoch != current.access_epoch:
        return Decision.DROP
    if current.request_revisions.get(item.request_id) != item.revision:
        return Decision.DROP
    if not item.grounded:
        return Decision.DROP
    if current.user_speaking or current.assistant_playing:
        return Decision.WAIT
    return Decision.PLAY
