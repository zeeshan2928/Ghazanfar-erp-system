# Claude Code Desktop Notification Hook — Planning & Execution Notes

**Project:** ghazanfar-erp-backend
**Purpose of this file:** Context handoff so Claude Code (running in Android Studio / VS Code) understands the full reasoning and can implement or extend this setup without re-explaining from scratch.

---

## Background / Goal

Zeeshan wants Claude Code to notify him on **Windows desktop, bottom-right corner** whenever:
1. Claude hits a **permission prompt** (needs approval to run a command / edit a file), or
2. Claude has been **idle 60+ seconds** waiting for input.

He wants to be able to step away from the terminal while Claude works (e.g. while doing other tasks like GhazanfarAdmin Android work or Dieline Studio), and only come back when actually needed — without babysitting the terminal window.

**Explicitly rejected approaches (for reference, don't re-suggest these):**
- Phone push notifications via ntfy.sh — rejected, he wants notifications on the Windows desktop itself, not phone.
- Custom 30-second idle watcher with a lock-file/polling script — considered but rejected as too fragile (race conditions between lock file writes and hook events). Went with Claude Code's **native 60-second idle threshold** instead, which is reliable and zero-maintenance.
- A "delay notification by N seconds to see if already answered" approach — discussed but dropped in favor of instant notification on `permission_prompt` combined with native idle detection.

---

## Final Agreed Design

Two files, one hook type (`Notification`), reacting to two matchers: `permission_prompt` and `idle_prompt`.

### Phase 1 — PowerShell notification script
**File:** `.claude/hooks/notify-windows.ps1`

Uses `System.Windows.Forms.NotifyIcon` to show a native Windows balloon/toast notification (bottom-right, near system tray). Takes a `-Matcher` parameter to distinguish between:
- `permission_prompt` → Warning icon, "Claude Code - Permission Needed"
- anything else (idle) → Info icon, "Claude Code - Idle"

```powershell
param([string]$Matcher)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

if ($Matcher -eq "permission_prompt") {
    $title = "Claude Code - Permission Needed"
    $message = "Claude is waiting for your approval to continue"
    $icon = [System.Drawing.SystemIcons]::Warning
} else {
    $title = "Claude Code - Idle"
    $message = "Claude has been waiting on your input"
    $icon = [System.Drawing.SystemIcons]::Information
}

$notify = New-Object System.Windows.Forms.NotifyIcon
$notify.Icon = $icon
$notify.Visible = $true
$notify.BalloonTipTitle = $title
$notify.BalloonTipText = $message
$notify.ShowBalloonTip(8000)
Start-Sleep -Seconds 8
$notify.Dispose()
```

### Phase 2 — Hook wiring
**File:** `.claude/settings.json`

Registers a `Notification` hook that fires the PowerShell script whenever Claude Code emits `permission_prompt` or `idle_prompt` (Claude Code's built-in idle threshold is fixed at 60 seconds — not user-configurable without a custom watcher, which was intentionally avoided).

```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "permission_prompt|idle_prompt",
        "hooks": [
          {
            "type": "command",
            "command": "powershell -NoProfile -WindowStyle Hidden -File \"$CLAUDE_PROJECT_DIR/.claude/hooks/notify-windows.ps1\" -Matcher permission_prompt",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

> Note: the command currently hardcodes `-Matcher permission_prompt` for both matchers since Claude Code hooks don't natively pass which matcher fired into the command string. If Claude Code (when implementing this) has access to an environment variable or stdin payload indicating which event fired, it should be used instead so idle notifications show the correct "Idle" message rather than always showing "Permission Needed." This is a known refinement opportunity — worth checking Claude Code's current hook payload docs, since hook capabilities may have changed since this was written.

### Phase 3 — Installation
1. Place both files inside `ghazanfar-erp-backend/.claude/` (create the `hooks` subfolder if it doesn't exist).
2. Do not overwrite any pre-existing `.claude/settings.json` content — merge the `hooks.Notification` block in if other hooks/settings already exist.
3. Restart the Claude Code session so it picks up the new hook config.

### Phase 4 — Verification
- Trigger a command that requires permission approval (e.g. a file write outside auto-approved paths) and confirm a Windows balloon notification appears bottom-right.
- Leave a Claude Code prompt idle for 60+ seconds and confirm the idle notification fires.

---

## Immediate Next Step for Claude Code (when this file is read)

Zeeshan asked whether Claude Code itself (in VS Code / Android Studio) can create these files directly in the project rather than him copy-pasting manually. **Yes** — Claude Code has file write access to the actual project directory, so it should:
1. Create `.claude/hooks/notify-windows.ps1` with the script above (or an improved version that correctly distinguishes idle vs. permission events if a better mechanism is available).
2. Create or merge `.claude/settings.json` with the hook block above.
3. Confirm both files were written to the correct paths and briefly explain how to test them.

---

## Project Context (for reference)

This hook setup is being added to **ghazanfar-erp-backend**, a NestJS/TypeScript backend (part of a larger custom ERP system replacing a contractor-built MySQL/MariaDB system) with:
- PostgreSQL database, Prisma ORM
- Modular `/src/modules` structure (controller/service/dto/entity per module)
- Path aliases (`@modules/*`, `@common/*`, `@database/*`)
- ESLint, Prettier, Jest, TypeScript strict mode
- Auth endpoints already scaffolded: `POST /users/register`, `POST /users/login`, `GET /users` (JWT-protected)

Architecture (broader ERP system): NestJS/TypeScript backend, PostgreSQL, React dashboard, Tauri Windows desktop app with offline-first SQLite, Kotlin Android app, outbox-pattern sync engine. VPS is on Hostinger KVM 2 (Ubuntu 24.04 LTS), already configured through PostgreSQL/Node.js/Nginx/UFW. This backend scaffolding is the current active phase, with CI/CD deployment to follow.
