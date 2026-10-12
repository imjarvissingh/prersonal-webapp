import 'package:flutter/foundation.dart';

import '../models/dashboard.dart';
import '../models/task.dart';
import '../services/api_client.dart';

class DashboardProvider extends ChangeNotifier {
  DashboardProvider(this.api);

  final ApiClient api;
  Dashboard? data;
  bool loading = false;
  String? error;

  Future<void> load() async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      data = await api.dashboard();
    } on ApiException catch (e) {
      error = e.message;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> setStatus(Task task, TaskStatus status) async {
    try {
      await api.updateTask(task.id, TaskInput(status: status));
    } on ApiException catch (e) {
      error = e.message;
    }
    await load();
  }
}
