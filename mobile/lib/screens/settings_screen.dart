import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/api_client.dart';
import '../state/auth_provider.dart';
import '../widgets/common.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  Future<void> _pickHour(BuildContext context, AuthProvider auth, {required bool start}) async {
    final user = auth.user;
    if (user == null) return;
    final current = start ? user.dayStart : user.dayEnd;
    final parts = current.split(':').map(int.parse).toList();
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: parts[0], minute: parts[1]),
    );
    if (picked == null) return;
    final value =
        '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
    try {
      await auth.updateProfile({start ? 'dayStart' : 'dayEnd': value});
    } on ApiException catch (e) {
      if (context.mounted) showSnack(context, e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        children: [
          ListTile(
            leading: const CircleAvatar(child: Icon(Icons.person)),
            title: Text(user?.name ?? ''),
            subtitle: Text(user?.email ?? ''),
          ),
          const Divider(),
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Text('Working hours (used by auto time-blocking)'),
          ),
          ListTile(
            leading: const Icon(Icons.wb_sunny_outlined),
            title: const Text('Day starts'),
            trailing: Text(user?.dayStart ?? '--:--'),
            onTap: () => _pickHour(context, auth, start: true),
          ),
          ListTile(
            leading: const Icon(Icons.nights_stay_outlined),
            title: const Text('Day ends'),
            trailing: Text(user?.dayEnd ?? '--:--'),
            onTap: () => _pickHour(context, auth, start: false),
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.dns_outlined),
            title: const Text('API server'),
            subtitle: Text(auth.api.baseUrl),
          ),
          ListTile(
            leading: Icon(Icons.logout, color: Theme.of(context).colorScheme.error),
            title: Text('Sign out', style: TextStyle(color: Theme.of(context).colorScheme.error)),
            onTap: auth.logout,
          ),
        ],
      ),
    );
  }
}
