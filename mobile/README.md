# Dev Tracker iOS

Flutter app for the Dev Tracker API, built for iPhone. See the [root README](../README.md) for the backend.

```bash
flutter pub get
flutter run -d ios --dart-define=API_URL=http://localhost:4000
flutter test
```

- `lib/services/api_client.dart`: typed REST client
- `lib/services/secure_store.dart`: Keychain storage for the token and server URL
- `lib/state/`: Provider `ChangeNotifier`s for auth, dashboard, the daily planner and projects
- `lib/screens/`: dashboard, today (time blocks, energy filter, backlog, auto time-block), projects, project detail, AI scaffolding, settings

On a physical iPhone, `localhost` is the phone itself: use your Mac's LAN address or the deployed HTTPS API, either with `--dart-define` or from the server button on the sign-in screen.
