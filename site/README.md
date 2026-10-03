# Word Guess hosted edition

This is the deployable Sites checkout. The original Node server remains in the parent folder for local play.

The browser polls its authenticated room once per second. Server-side game rules are shared with the local edition. D1 stores the room, seats, secrets and match history; revision-checked atomic writes prevent simultaneous joins or guesses from overwriting state. Secrets are returned only after a match finishes. Presence updates every few seconds and marks disconnected players offline after about 12 seconds. Browser seat tokens let players resume without accounts. Hosted room state survives Worker restarts and publications.

## Checks and build

```sh
npm install
npm run db:generate
npm run build
npm run validate
npm test
```

The migration tools are development dependencies only. The generated Worker has no runtime dependencies. Database migrations are packaged and applied by Sites during deployment. Do not manually change already-applied migrations.

The production project identity is saved in `.openai/hosting.json`. Use the Sites publishing workflow to update this same project. Publish all changes made here, including homepage text. Assets are embedded into the Worker by the build script.

Rule tests and a SQLite-backed Worker integration test cover simultaneous joins/guesses, secret redaction, restart recovery, presence, draws and rematches. This is a private-room game, not a production-scale competitive service; rate limiting and room retention policies can be added for larger public use.
