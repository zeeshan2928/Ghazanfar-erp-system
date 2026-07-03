# Claude Code Handoff — Desktop Notification Hook

Paste this whole message to Claude Code in Android Studio, inside the `ghazanfar-erp-backend` project.

---

I'm setting up a desktop notification hook for you. Here's the full context and plan:

**Goal:** Show a Windows notification (bottom-right corner) whenever you hit a permission prompt, or when you've been idle 60+ seconds waiting for my input. I want to step away from the terminal without missing anything.

**Rejected approaches (don't suggest these):** phone push via ntfy.sh (I want desktop, not phone), and a custom 30-second idle watcher using a lock file (too fragile, race conditions). We're using your native 60-second idle threshold instead — reliable, zero maintenance.

**Design:**
1. Create `.claude/hooks/notify-windows.ps1` — a PowerShell script using `System.Windows.Forms.NotifyIcon` to show a balloon notification. It should take a `-Matcher` parameter and show different title/icon depending on whether it's `permission_prompt` (Warning icon, "Permission Needed") or idle (Info icon, "Idle").
2. Create or merge into `.claude/settings.json` — register a `Notification` hook matching `permission_prompt|idle_prompt` that calls the script.

**Known refinement needed:** In our earlier draft, the hook command hardcoded `-Matcher permission_prompt` for both event types, since we weren't sure how to pass which matcher actually fired into the command. Please check your current hook documentation/payload — if there's now an environment variable or stdin payload that tells you which event triggered the hook (permission vs idle), use that so the notification correctly distinguishes the two instead of always showing "Permission Needed."

**Next step:** Implement both files now, wire up the hook correctly (fixing the matcher-detection issue above if possible), and briefly tell me how to test it — I'll trigger a permission prompt and also leave a prompt idle for 60+ seconds to confirm both notification types work.

**Project context:** This is `ghazanfar-erp-backend`, a NestJS/TypeScript backend for a custom ERP replacing a contractor-built MySQL system — PostgreSQL + Prisma, modular `/src/modules` structure, path aliases, JWT auth already scaffolded. Part of a bigger system with a React dashboard, Tauri Windows desktop app, and Kotlin Android app syncing via an outbox pattern.
