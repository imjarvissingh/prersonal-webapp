/// Build-time configuration.
///
/// Override the API with `--dart-define=API_URL=https://api.example.com`.
/// The iOS simulator can reach the host machine on localhost; a physical
/// iPhone needs the Mac's LAN address or the deployed HTTPS URL (it can also be
/// changed at runtime from the sign-in screen).
class AppConfig {
  static const String defaultApiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://localhost:4000',
  );
}
