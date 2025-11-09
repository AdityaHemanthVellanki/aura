# Aura Mobile

Expo (React Native + TypeScript) app for Aura.

## Development
- `npm start` starts the dev server (iOS default launch configured).
- `npm run ios` builds/runs native iOS.
- `npm run android` builds/runs native Android.

### Mock AI mode (offline demo)

To demo chats without connecting to OpenAI/Hume:

1. Set the flag in your `.env`:

```
EXPO_PUBLIC_USE_MOCK_AI=true
```

2. Restart Expo with a clear cache:

```
npx expo start --clear
```

When enabled, Aura uses `/api/mockReply` (with local fallback) to generate varied, emotionally intelligent replies within ~1s, avoiding GPT calls.

## Microphone & Audio Permissions

Aura records and plays audio. Permissions are configured statically and requested at runtime:

- iOS
  - Runtime: microphone permission is requested when starting a recording.
  - Simulator: if not prompted, open Settings → Privacy → Microphone and enable for the app.
  - Info.plist includes:
    - `NSMicrophoneUsageDescription`: microphone access for recording.
    - `NSCameraUsageDescription`: optional, for video recording.
    - `NSPhotoLibraryUsageDescription`: optional, for uploads.

- Android
  - Runtime requests for `RECORD_AUDIO` and legacy storage permissions (`READ/WRITE_EXTERNAL_STORAGE`) for broad device coverage.
  - Ensure emulator mic is enabled (AVD settings → Microphone).
  - AndroidManifest permissions are injected from `app.json`.

## Prebuild

Ensure native manifests reflect the configuration:

```
npx expo prebuild --platform ios,android
```

## Troubleshooting
- If simulator auto-launch fails, ensure Xcode is installed and set:
  - `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`
- Use `npx expo-doctor` to verify SDK health.
## Local Storage Scheme (Aura Onboarding)

- Keys in AsyncStorage:
  - `aura:profile` → `{ name, username, createdAt, personalitySummary?, voicePending? }`
  - `aura:answers` → `[{ questionId, category, question, answerText, audioId?, skipped?, timestamp }]`
  - `aura:audioFiles` → `[{ id, uri, createdAt }]` (files saved under `documentDirectory/aura_audio/`)
- Key in SecureStore:
  - `aura:consent` → `{ accepted: true, timestamp, evidenceTranscript?, proofAudioId? }`

### Exporting/Uploading Audio Later
- All recordings are stored locally at `documentDirectory/aura_audio/{uuid}.wav` and indexed in `aura:audioFiles`.
- You can read the index and upload selected files to your server for voice cloning.

### Wiping Local Data
- Use helper `deleteAllData()` from `src/lib/localStore.ts` to clear keys and delete the audio folder.
## Voice-Only Onboarding (AuraOnboardingVoice)

- Flow:
  - TTS intro, name capture via auto-record (≤20s) → transcribe → unique username.
  - Iterate `src/data/aura_personality_questions.json`: TTS question → beep → auto-record → save audio locally → transcribe → store answer.
  - 30% chance follow-up; “skip” recognized via transcript.
  - Summary generated locally (fallback) and saved to profile.
  - Consent: prompt phrase, record (≤10s), transcribe; if includes “I consent” save to SecureStore.
  - Completion: navigate to `TalkToAura`.

- Local Storage Keys:
  - `aura:profile` → `{ name, username, personalitySummary, createdAt }`
  - `aura:answers` → `[{ questionId, question, answerText, audioId, timestamp, skipped? }]`
  - `aura:audioFiles` → `[{ id, uri, lengthSec?, createdAt }]`
  - SecureStore `aura:consent` → `{ accepted, evidenceAudioId, evidenceTranscript, timestamp }`

- Implementation Notes:
  - Uses `expo-speech` for dev TTS; production can call server `/api/tts` with audio playback via `expo-av`.
  - Audio files saved at `documentDirectory/aura_audio/{uuid}.wav` and indexed in AsyncStorage.
  - Transcription uploads via `FormData` to `/api/transcribe`.
  - Persists `aura:currentQuestionIndex_voice` to resume after restart.
  - “Delete local data” uses `deleteAllData()` from `src/lib/localStore.ts`.
