# Verification record

Verified locally on 2026-10-03.

## Automated

`node --test`: rule and real HTTP/SSE integration tests. Covers capacity and invalid rooms, bearer-token identity, redacted snapshots, online presence, duplicate secret/guess rejection, stale-round and stale-match rejection, input validation, case-insensitive letter counts, hidden lengths, wrong whole words, alternating turns, RED and BLUE victories, same-round draws, bilateral rematches and seat/history recovery.

## Two browser sessions

Used separate origin storage in Brave (`localhost:3000` for RED and `127.0.0.1:3000` for BLUE), both connected to the same server and room.

- Created RED as Alex and joined BLUE as Sam using the room code; both screens synchronized into submission.
- Submitted APPLE and PEPPER. RED's lowercase `p` returned `3 Ps`; BLUE's lowercase `p` returned `2 Ps`. Each saw only their own history. Inactive player controls were disabled.
- RED guessed length 5 and saw only “Incorrect length.” BLUE guessed length 5 and saw “Correct length!” Neither action ended the match.
- Refreshed RED during play: same room, seat, turn and previous clues restored.
- Both guessed WRONG: match continued into the next round.
- RED correctly guessed PEPPER; BLUE still received a turn with no word reveal. BLUE guessed WRONG; RED won and both words appeared.
- Both requested rematch, submitted MANGO and GRAPE, and histories reset. RED guessed WRONG, BLUE guessed MANGO: BLUE won.
- Another rematch used LEMON and MELON. Both guessed correctly in round 1: draw on both screens.
- Navigated BLUE away: RED received a disconnected banner. Returned BLUE to the game: the same seat and result restored.
- Inspected desktop layout and mobile layout with a narrow browser viewport.

No external public deployment or production load test has been performed. In-memory room state does not survive server restarts.

## Follow-up keyboard and responsive verification

The hosted edition in `site/` has since been deployed with D1 persistence. Two isolated browser sessions checked Enter in the name, room-code, secret, letter, length and whole-word fields; invalid-code recovery retaining inputs; visible secret typing; cursor and focus retention while the opponent submits; separate drafts when switching guess types; keyboard-operated rematches and result history; and history remaining expanded through synchronization.

Browser viewport checks covered 320, 390, 768 and 1280 pixel widths, including a 390×360 viewport representing reduced space while a keyboard is open. No horizontal overflow was observed, including long player names. These were browser viewport checks, not tests on physical iOS or Android devices. The 8 hosted server tests also passed. Temporary local preview processes were stopped after verification.
