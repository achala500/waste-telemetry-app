# ⚡ Apple Shortcuts Integration for Chrono Telemetry

> Designed adhering to **Apple Human Interface Guidelines (HIG)** and **Omni Master Directives**.
> High-velocity, zero-friction time telemetry logging from iPhone, iPad, Mac, and Apple Watch.

---

## 📋 Overview

Chrono Telemetry provides a native bridge into iOS Shortcuts and Siri. You can log distraction spirals, deep focus capsules, or automated background app launches with zero friction:

- 🎙️ **Hands-Free Siri Voice Logging**: *"Hey Siri, log focus"* or *"Hey Siri, logged 30m reels"*.
- 📲 **Interactive Widget / Action Button**: Tap from your Lock Screen, Dynamic Island, or iPhone Action Button.
- 🔄 **Automated Personal Automations**: Fires silent background webhooks when distracting apps (Instagram, TikTok, YouTube) open and close.
- 🛡️ **Offline Resilience**: Automatically queues into client-side IndexedDB Write-Ahead Log (WAL) when network is unreachable.

---

## 🚀 Quick Setup (3 Minutes)

### Shortcut Configuration Parameters
| Parameter | Value | Description |
| :--- | :--- | :--- |
| **Endpoint** | `https://your-domain.com/api/telemetry` | Cloud or local Chrono endpoint |
| **HTTP Method** | `POST` | REST telemetry collector |
| **Header 1** | `Content-Type: application/json` | Standard JSON payload |
| **Header 2** | `x-api-key: a7a00b168ea20c8ba6344fe9518bbbdd9bca6edf1a54265e429b0f33ad31e3d8` | Telemetry authentication key |

---

## 🛠️ Step-by-Step iOS Shortcuts Action Breakdown

Follow these exact steps in the iOS **Shortcuts** app:

```
[1] Ask for Input (Text: "What activity or app are you logging?")
         │
         ▼
[2] Choose from Menu ("Select Category")
    ├─ 1. Wasted Time (Distraction) ──> Set Variable: Category = "wasted"
    ├─ 2. Deep Focus Session        ──> Set Variable: Category = "focus"
    └─ 3. Routine / Necessary       ──> Set Variable: Category = "routine"
         │
         ▼
[3] Ask for Input (Number: "Duration in minutes?", Default: 25)
         │
         ▼
[4] Date (Current Date)
         │
         ▼
[5] Format Date (ISO 8601 Style)
         │
         ▼
[6] Dictionary (Build JSON Request Body)
    ├─ event:           "manual"
    ├─ label:           [Provided App / Activity Name]
    ├─ category:        [Selected Category]
    ├─ durationMinutes: [Input Number]
    └─ timestamp:       [Formatted ISO Date]
         │
         ▼
[7] Get Contents of URL (POST to /api/telemetry)
    ├─ Headers:  Content-Type: application/json
    │            x-api-key: a7a00b168ea...
    └─ Body:     [Dictionary]
         │
         ▼
[8] Vibrate Device (Haptic: Success) + Show Notification ("Logged to Chrono")
```

---

## 📱 Detailed Action Configuration in iOS Shortcuts App

### Action 1: Ask for Input / Get App Name
1. In Shortcuts, tap **Add Action** > search for **Ask for Input**.
2. Set prompt to: `What app or activity are you logging?`
3. Set Input Type to: `Text`.
4. Set Default Answer: `Instagram Reels` (optional).
5. Rename output variable to `AppName`.

### Action 2: Category Selector
1. Tap **Add Action** > search for **Choose from Menu**.
2. Set prompt: `Select Category`.
3. Add Menu items:
   - `Wasted (Distraction)` -> Add **Text** action inside block: `wasted` -> **Set Variable** `Category`.
   - `Deep Focus` -> Add **Text** action inside block: `focus` -> **Set Variable** `Category`.
   - `Routine` -> Add **Text** action inside block: `routine` -> **Set Variable** `Category`.

### Action 3: Duration Input
1. Tap **Add Action** > search for **Ask for Input**.
2. Set prompt to: `Duration (minutes):`.
3. Set Input Type to: `Number`.
4. Set Default Answer: `25`.
5. Rename output variable to `DurationMinutes`.

### Action 4: Get Current Date & Format
1. Tap **Add Action** > search for **Date**. Select `Current Date`.
2. Tap **Add Action** > search for **Format Date**.
   - Input: `Current Date`.
   - Date Format: `ISO 8601`.
   - Include Time: `Turn On`.

### Action 5: Get Contents of URL (POST to `/api/telemetry`)
1. Tap **Add Action** > search for **Get Contents of URL**.
2. **URL**: `https://<YOUR_DOMAIN>/api/telemetry` (or `http://localhost:3000/api/telemetry` via Tailscale/local network).
3. Tap arrow to expand options:
   - **Method**: `POST`
   - **Headers**:
     - Key: `Content-Type` | Value: `application/json`
     - Key: `x-api-key` | Value: `a7a00b168ea20c8ba6344fe9518bbbdd9bca6edf1a54265e429b0f33ad31e3d8`
   - **Request Body**: `JSON`
   - Add Fields:
     - `event` (Text): `manual`
     - `label` (Text): Select variable `AppName`
     - `category` (Text): Select variable `Category`
     - `durationMinutes` (Number): Select variable `DurationMinutes`
     - `timestamp` (Text): Select variable `Formatted Date`

### Action 6: Confirmation Feedback
1. Tap **Add Action** > search for **Vibrate Device**.
2. Tap **Add Action** > search for **Show Notification**:
   - Title: `Chrono Telemetry Logged`
   - Message: `Recorded [DurationMinutes]m of [AppName] ([Category])`

---

## 🎙️ Siri Voice Triggers

You can invoke Chrono completely hands-free using Siri:

| Siri Phrase | Triggered Behavior | Default Payload |
| :--- | :--- | :--- |
| **"Hey Siri, log focus"** | Logs active focus session | `{ event: "manual", label: "Deep Focus", category: "focus", durationMinutes: 45 }` |
| **"Hey Siri, logged 30m reels"** | Logs distraction binge | `{ event: "manual", label: "Instagram Reels", category: "wasted", durationMinutes: 30 }` |
| **"Hey Siri, log distraction"** | Prompts for app & duration | Prompts voice response, then POSTs to API |
| **"Hey Siri, start focus block"** | Starts live Focus Stopwatch | Sends `{ event: "focus_start", label: "Deep Work" }` |

> [!TIP]
> **Customizing Siri Phrases**:
> Name the shortcut in the Shortcuts app with the exact trigger phrase you want to speak. Siri matches the exact shortcut title automatically!

---

## 🔄 Automated App Open / Close Tracking (Personal Automations)

To track social media or doomscrolling without manually logging each session:

1. Open **Shortcuts** app > tap the **Automation** tab (bottom bar).
2. Tap **New Automation** (`+`).
3. Select **App** (e.g. Choose *Instagram*, *TikTok*, *YouTube*, or *X*).
4. Select **Is Opened**:
   - Check **Run Immediately** (toggle off *Notify When Run* for invisible tracking).
   - Tap **New Blank Automation** > add **Get Contents of URL**:
     - URL: `https://<YOUR_DOMAIN>/api/telemetry`
     - Method: `POST`
     - Header: `x-api-key: a7a00b168ea20c8ba6344fe9518bbbdd9bca6edf1a54265e429b0f33ad31e3d8`
     - Body:
       ```json
       {
         "event": "app_open",
         "label": "Instagram",
         "category": "wasted"
       }
       ```
5. Repeat for **Is Closed**:
   - Select **Is Closed** > **Run Immediately**.
   - Body:
     ```json
     {
       "event": "app_close",
       "label": "Instagram",
       "category": "wasted"
     }
     ```
6. **Automatic Duration Computation**: Chrono's backend server automatically matches `app_open` with `app_close`, computes the elapsed duration, and commits the completed block to Google Sheets and Firestore.

---

## 🔘 Hardware Triggers & Ergonomics

- **iPhone 15 / 16 Pro Action Button**:
  Go to iOS `Settings` > `Action Button` > select `Shortcut` > choose `Chrono Log Event`. Instantly pops up the quick-logger from any screen.
- **Back Tap (Accessibility)**:
  Go to iOS `Settings` > `Accessibility` > `Touch` > `Back Tap` > Double Tap: `Chrono Log Event`.
- **Lock Screen & Control Center (iOS 18)**:
  Add the Chrono Shortcut directly to your Lock Screen bottom corner toggles or Control Center panel.

---

## 🧪 Terminal / cURL Verification

Test your endpoint and authentication directly:

```bash
# 1. Manual Quick Log
curl -X POST "http://localhost:3000/api/telemetry" \
  -H "Content-Type: application/json" \
  -H "x-api-key: a7a00b168ea20c8ba6344fe9518bbbdd9bca6edf1a54265e429b0f33ad31e3d8" \
  -d '{
    "event": "manual",
    "label": "Instagram Reels",
    "category": "wasted",
    "durationMinutes": 30
  }'

# 2. Simulated App Open
curl -X POST "http://localhost:3000/api/telemetry" \
  -H "Content-Type: application/json" \
  -H "x-api-key: a7a00b168ea20c8ba6344fe9518bbbdd9bca6edf1a54265e429b0f33ad31e3d8" \
  -d '{
    "event": "app_open",
    "label": "Instagram",
    "category": "wasted"
  }'

# 3. Simulated App Close (Calculates duration)
curl -X POST "http://localhost:3000/api/telemetry" \
  -H "Content-Type: application/json" \
  -H "x-api-key: a7a00b168ea20c8ba6344fe9518bbbdd9bca6edf1a54265e429b0f33ad31e3d8" \
  -d '{
    "event": "app_close",
    "label": "Instagram",
    "category": "wasted"
  }'
```

---

*Authored for Omni Telemetry & Chrono Time Engine.*
