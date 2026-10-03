# Word Guess

A complete two-player browser game using Node.js and a vanilla HTML/CSS/JavaScript frontend. No runtime dependencies or accounts.

## Run locally

Install Node.js 22 or newer, then run from this folder:

```sh
npm start
```

On Windows PowerShell with script execution disabled, use `npm.cmd start`, or simply `node server.js`.

Open http://localhost:3000. Use two different browsers, browser profiles, or a normal and private window to test two seats. Tabs in the same browser profile share the saved seat. Create a room and send its code or invitation link to your friend. For LAN play, both devices can open `http://YOUR-COMPUTER-LAN-IP:3000` if your firewall allows the port. Clipboard copying requires HTTPS or localhost; otherwise the game displays the text to copy manually.

```sh
npm test
```

## Rules and implementation

The creator is RED; the joiner is BLUE. Each locks a 2–20 letter secret. RED takes the first action each round, then BLUE. Only a correct whole word wins. Results are evaluated after BLUE's action, permitting same-round draws. Both players must request a rematch before new secrets are collected.

The Node server owns all room state. Cryptographically random seat tokens authenticate each action. Public snapshots contain readiness, names, turn and the requesting player's history; secrets appear only at the result screen. Invalid, duplicate, stale-round and out-of-turn submissions are rejected. Server-sent events synchronize both players and report disconnects. The token saved in localStorage restores a seat on refresh; clearing browser storage or leaving the screen discards that browser's token. Leaving does not free the reserved seat.

## Online deployment

The game is deployed at [Word Guess](https://word-guess-duel.ahnaf-abid02.chatgpt.site). Anyone with this URL can open the game; individual rooms still require a private code or invitation link. The hosted edition lives in `site/`, uses a Cloudflare Worker and D1 database, and synchronizes rooms once per second. Its rooms survive Worker restarts. See `site/README.md` for hosted build and update instructions.

The following instructions and limitations apply to the original local Node edition. To deploy that edition independently, use a host that runs a long-lived Node.js process, sets `PORT`, and routes HTTPS traffic to it. Use `npm start` as the start command; no build or install step is necessary. A container recipe is included.

Hosting requirements:

- Run exactly one process/replica because rooms live in memory. Server restarts or redeploys lose matches and seats. Disconnected inactive rooms expire after 24 hours.
- Support streaming HTTP responses (SSE). Disable proxy buffering for `/events`, allow a long connection timeout, and preserve the Host header. Heartbeats are sent every 15 seconds.
- Static-only hosting and short-lived serverless functions cannot run this server as written.
- Use HTTPS in production. Seat tokens are bearer credentials; avoid logging `/events` query strings. Keep tokens private. Invitation links contain only the room code.
- For larger public use, add rate limiting, durable room storage and a shared realtime transport before enabling multiple replicas. This version is intended for private games between friends.

Container example:

```sh
docker build -t word-guess .
docker run --rm -p 3000:3000 word-guess
```

## Verification

Automated rule tests cover letter counts including absent letters, correct and incorrect lengths, wrong words, turn enforcement, stale guesses, secret validation, capacity, identity, secret redaction, RED/BLUE wins, draws and rematches. Browser verification results are recorded in `TESTING.md`.
