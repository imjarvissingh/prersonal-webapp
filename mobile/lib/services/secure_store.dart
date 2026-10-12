import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Keychain-backed storage for the auth token and the API URL override.
class SecureStore {
  static const _tokenKey = 'devtracker.token';
  static const _apiUrlKey = 'devtracker.apiUrl';

  final FlutterSecureStorage _storage;

  SecureStore([FlutterSecureStorage? storage])
    : _storage =
          storage ??
          const FlutterSecureStorage(
            iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
          );

  Future<String?> readToken() => _storage.read(key: _tokenKey);

  Future<void> writeToken(String? token) => token == null
      ? _storage.delete(key: _tokenKey)
      : _storage.write(key: _tokenKey, value: token);

  Future<String?> readApiUrl() => _storage.read(key: _apiUrlKey);

  Future<void> writeApiUrl(String? url) => url == null || url.isEmpty
      ? _storage.delete(key: _apiUrlKey)
      : _storage.write(key: _apiUrlKey, value: url);
}
