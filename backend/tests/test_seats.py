"""Seat carry-over is the one piece of real arithmetic in the ladder, and it
decides who wins a seat. Run directly: python backend/tests/test_seats.py
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.routers.live import BOSS_WINDOWS, _remaining_seats


def closed(filled):
    return {"status": "closed", "seats_filled": filled}


def main():
    # Nothing closed yet -> the whole section is up for grabs.
    assert _remaining_seats(48, []) == 48

    # Two windows took 12 and 30 of 48.
    assert _remaining_seats(48, [closed(12), closed(30)]) == 6

    # Exactly full.
    assert _remaining_seats(48, [closed(48)]) == 0

    # Overfill can't hand out negative seats.
    assert _remaining_seats(48, [closed(40), closed(20)]) == 0

    # A round that closed with no bids stores null, not 0.
    assert _remaining_seats(48, [closed(None), closed(10)]) == 38

    # Zero-capacity section stays at zero.
    assert _remaining_seats(0, []) == 0

    # The ladder is the 12 real BOSS windows, in order, no duplicates.
    assert len(BOSS_WINDOWS) == 12
    assert len(set(BOSS_WINDOWS)) == 12
    assert BOSS_WINDOWS[0] == "Round 1 Window 1"
    assert BOSS_WINDOWS[-1] == "Round 2A Window 3"

    print("ok")


if __name__ == "__main__":
    main()
