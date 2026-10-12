import 'package:flutter/foundation.dart';

import '../config.dart';
import '../models/user.dart';
import '../services/api_client.dart';
import '../services/secure_store.dart';

enum AuthStatus { unknown, signedOut, signedIn }

class AuthProvider extends ChangeNotifier {
  AuthProvider(this.api, this.store) {
    api.onUnauthorized = () => _signOut(notify: true);
  }

  final ApiClient api;
  final SecureStore store;

  AuthStatus status = AuthStatus.unknown;
  User? user;

  /// Restores the API URL override and session from the keychain.
  Future<void> init() async {
    final savedUrl = await store.readApiUrl();
    if (savedUrl != null) api.baseUrl = savedUrl;

    final token = await store.readToken();
    if (token == null) {
      status = AuthStatus.signedOut;
      notifyListeners();
      return;
    }
    api.token = token;
    try {
      user = await api.me();
      status = AuthStatus.signedIn;
    } on ApiException catch (e) {
      if (e.isUnauthorized) {
        await _signOut();
      } else {
        // Offline at launch: keep the session and let screens show the error.
        status = AuthStatus.signedIn;
      }
    }
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    final result = await api.login(email.trim(), password);
    await _signIn(result);
  }

  Future<void> register(String name, String email, String password) async {
    final result = await api.register(name.trim(), email.trim(), password);
    await _signIn(result);
  }

  Future<void> updateProfile(Map<String, dynamic> body) async {
    user = await api.updateMe(body);
    notifyListeners();
  }

  Future<void> logout() => _signOut(notify: true);

  Future<void> setApiUrl(String url) async {
    final value = url.trim().isEmpty ? AppConfig.defaultApiUrl : url.trim();
    api.baseUrl = value;
    await store.writeApiUrl(value == AppConfig.defaultApiUrl ? null : value);
    notifyListeners();
  }

  Future<void> _signIn(AuthResult result) async {
    api.token = result.token;
    await store.writeToken(result.token);
    user = result.user;
    status = AuthStatus.signedIn;
    notifyListeners();
  }

  Future<void> _signOut({bool notify = false}) async {
    api.token = null;
    user = null;
    status = AuthStatus.signedOut;
    await store.writeToken(null);
    if (notify) notifyListeners();
  }
}
