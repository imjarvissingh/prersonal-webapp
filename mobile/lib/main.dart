import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'screens/auth_screen.dart';
import 'screens/home_shell.dart';
import 'services/api_client.dart';
import 'services/secure_store.dart';
import 'state/auth_provider.dart';
import 'state/dashboard_provider.dart';
import 'state/projects_provider.dart';
import 'state/today_provider.dart';
import 'theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final api = ApiClient();
  runApp(DevTrackerApp(api: api, store: SecureStore()));
}

class DevTrackerApp extends StatelessWidget {
  const DevTrackerApp({super.key, required this.api, required this.store});

  final ApiClient api;
  final SecureStore store;

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<ApiClient>.value(value: api),
        ChangeNotifierProvider(create: (_) => AuthProvider(api, store)..init()),
        ChangeNotifierProvider(create: (_) => DashboardProvider(api)),
        ChangeNotifierProvider(create: (_) => TodayProvider(api)),
        ChangeNotifierProvider(create: (_) => ProjectsProvider(api)),
      ],
      child: MaterialApp(
        title: 'Dev Tracker',
        debugShowCheckedModeBanner: false,
        theme: buildTheme(Brightness.light),
        darkTheme: buildTheme(Brightness.dark),
        home: const AuthGate(),
      ),
    );
  }
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final status = context.select<AuthProvider, AuthStatus>((a) => a.status);
    return switch (status) {
      AuthStatus.unknown => const Scaffold(body: Center(child: CircularProgressIndicator())),
      AuthStatus.signedOut => const AuthScreen(),
      AuthStatus.signedIn => const HomeShell(),
    };
  }
}
