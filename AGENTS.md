# Notes for coding agents

Read `README.md` first (architecture, schema, API).

- Backend: `cd backend && .venv/Scripts/python -m pytest -q` must pass. Keep rules pure in `logic.py`,
  DB-touching game state in `services.py`, HTTP in `main.py`. Schema changes go in `schema.sql`
  (it drops and recreates tables; run `python seed.py` after editing).
- Frontend: `npx tsc --noEmit && npm run lint && npm run build` in `frontend/`. All backend calls go
  through `lib/api.ts`; keep its types in sync with `main.py` responses.
- Grading, XP, hearts and streaks are server-side only. Never send answers to the client
  (`logic.public_payload` strips them).
- Run both servers with the `api` and `web` entries in `.claude/launch.json`.
- Gotchas found while testing:
  - React's event root is `document` in the App Router, so `stopPropagation` can't shield a
    `document` listener (see `learning-path.tsx`).
  - Key `LessonPlayer` by its target. Client navigation otherwise reuses the instance and its state.
  - The lesson `Footer` swallows Enter's default action and ignores Enter for 400ms after mounting.
