import 'package:flutter/foundation.dart';

import '../models/project.dart';
import '../services/api_client.dart';

class ProjectsProvider extends ChangeNotifier {
  ProjectsProvider(this.api);

  final ApiClient api;
  List<Project> projects = [];
  String? statusFilter; // null = current (not archived)
  bool loading = false;
  String? error;

  Future<void> load() async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      projects = await api.projects(status: statusFilter);
    } on ApiException catch (e) {
      error = e.message;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  void setStatusFilter(String? status) {
    statusFilter = status;
    load();
  }
}
