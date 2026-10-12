import 'package:flutter/foundation.dart';

import '../models/task.dart';
import '../services/api_client.dart';
import '../utils/dates.dart';

/// Daily planner state: the selected day's tasks plus the backlog.
class TodayProvider extends ChangeNotifier {
  TodayProvider(this.api);

  final ApiClient api;

  String date = DateKeys.today();
  String today = DateKeys.today();
  List<Task> tasks = [];
  List<Task> backlog = [];
  Level? energyFilter;
  bool loading = false;
  String? error;
  bool _rolledOver = false;

  List<Task> get visible =>
      energyFilter == null ? tasks : tasks.where((t) => t.energy == energyFilter).toList();

  List<Task> get timeBlocked {
    final list = visible.where((t) => t.timeBlock != null).toList()
      ..sort((a, b) => a.timeBlock!.start.compareTo(b.timeBlock!.start));
    return list;
  }

  List<Task> get anytime => visible.where((t) => t.timeBlock == null).toList();

  int get doneCount => tasks.where((t) => t.isDone).length;

  int get plannedMinutes => tasks.fold(0, (s, t) => s + t.estimateMinutes);

  /// Runs the server rollover once per app session so yesterday's unfinished
  /// tasks appear on today straight away, even before the midnight job.
  Future<void> ensureRolledOver() async {
    if (_rolledOver) return;
    _rolledOver = true;
    try {
      await api.rollover();
    } on ApiException {
      _rolledOver = false;
    }
  }

  Future<void> load() async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      await ensureRolledOver();
      final results = await Future.wait([api.tasks(date: date), api.tasks(backlog: true)]);
      tasks = results[0].tasks;
      today = results[0].today;
      backlog = results[1].tasks.where((t) => !t.isDone).toList();
    } on ApiException catch (e) {
      error = e.message;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  void setDate(String value) {
    date = value;
    load();
  }

  void setEnergyFilter(Level? level) {
    energyFilter = level;
    notifyListeners();
  }

  Future<void> setStatus(Task task, TaskStatus status) async {
    tasks = [for (final t in tasks) t.id == task.id ? t.copyWith(status: status) : t];
    notifyListeners();
    try {
      await api.updateTask(task.id, TaskInput(status: status));
    } on ApiException catch (e) {
      error = e.message;
    }
    await load();
  }

  Future<void> save(Task? existing, TaskInput input) async {
    if (existing == null) {
      await api.createTask(input);
    } else {
      await api.updateTask(existing.id, input);
    }
    await load();
  }

  Future<void> quickAdd(String title) async {
    await api.createTask(TaskInput(title: title, scheduledDate: date));
    await load();
  }

  Future<void> delete(Task task) async {
    await api.deleteTask(task.id);
    await load();
  }

  Future<void> pullIntoDay(Task task) async {
    await api.updateTask(task.id, TaskInput(scheduledDate: date));
    await load();
  }

  Future<void> sendToBacklog(Task task) async {
    await api.updateTask(task.id, const TaskInput(clear: {'scheduledDate'}));
    await load();
  }

  Future<AutoScheduleResult> autoSchedule() async {
    final result = await api.autoSchedule(date);
    tasks = result.tasks;
    notifyListeners();
    return result;
  }
}
