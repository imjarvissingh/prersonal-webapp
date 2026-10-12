import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../config.dart';
import '../models/dashboard.dart';
import '../models/plan.dart';
import '../models/project.dart';
import '../models/task.dart';
import '../models/user.dart';

class ApiException implements Exception {
  final int status;
  final String message;
  const ApiException(this.status, this.message);

  bool get isUnauthorized => status == 401;

  @override
  String toString() => message;
}

class AuthResult {
  final String token;
  final User user;
  const AuthResult(this.token, this.user);
}

class TaskListResult {
  final List<Task> tasks;
  final String today;
  const TaskListResult(this.tasks, this.today);
}

class AutoScheduleResult {
  final int placed;
  final int unplaced;
  final List<Task> tasks;
  const AutoScheduleResult(this.placed, this.unplaced, this.tasks);
}

/// Thin typed wrapper over the Dev Tracker REST API.
class ApiClient {
  ApiClient({http.Client? httpClient, String? baseUrl})
    : _http = httpClient ?? http.Client(),
      _baseUrl = _normalize(baseUrl ?? AppConfig.defaultApiUrl);

  final http.Client _http;
  String _baseUrl;
  String? token;

  /// Called whenever an authenticated request comes back 401.
  void Function()? onUnauthorized;

  String get baseUrl => _baseUrl;
  set baseUrl(String value) => _baseUrl = _normalize(value);

  static String _normalize(String url) => url.trim().replaceAll(RegExp(r'/+$'), '');

  Future<dynamic> _send(
    String method,
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? query,
  }) async {
    final uri = Uri.parse('$_baseUrl$path')
        .replace(queryParameters: query == null || query.isEmpty ? null : query);
    final headers = <String, String>{
      'Accept': 'application/json',
      if (body != null) 'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };

    http.Response res;
    try {
      final request = http.Request(method, uri)..headers.addAll(headers);
      if (body != null) request.body = jsonEncode(body);
      res = await http.Response.fromStream(
        await _http.send(request).timeout(const Duration(seconds: 75)),
      );
    } on TimeoutException {
      throw const ApiException(0, 'The server took too long to respond.');
    } on SocketException {
      throw const ApiException(0, "Can't reach the server. Check your connection.");
    } on http.ClientException {
      throw const ApiException(0, "Can't reach the server. Check your connection.");
    }

    if (res.statusCode == 204 || res.body.isEmpty) return null;
    dynamic data;
    try {
      data = jsonDecode(res.body);
    } on FormatException {
      data = null;
    }
    if (res.statusCode >= 400) {
      if (res.statusCode == 401 && token != null) onUnauthorized?.call();
      final message = data is Map<String, dynamic> && data['error'] is String
          ? data['error'] as String
          : 'Request failed (${res.statusCode})';
      throw ApiException(res.statusCode, message);
    }
    return data;
  }

  Future<Map<String, dynamic>> _get(String path, [Map<String, String>? query]) async =>
      (await _send('GET', path, query: query)) as Map<String, dynamic>;

  Future<Map<String, dynamic>> _post(String path, [Map<String, dynamic>? body]) async =>
      (await _send('POST', path, body: body ?? const {})) as Map<String, dynamic>;

  Future<Map<String, dynamic>> _patch(String path, Map<String, dynamic> body) async =>
      (await _send('PATCH', path, body: body)) as Map<String, dynamic>;

  Future<void> _delete(String path) => _send('DELETE', path);

  // ---- Auth ----
  Future<AuthResult> login(String email, String password) async {
    final data = await _post('/api/auth/login', {'email': email, 'password': password});
    return AuthResult(data['token'] as String, User.fromJson(data['user'] as Map<String, dynamic>));
  }

  Future<AuthResult> register(String name, String email, String password) async {
    final data = await _post('/api/auth/register', {
      'name': name,
      'email': email,
      'password': password,
    });
    return AuthResult(data['token'] as String, User.fromJson(data['user'] as Map<String, dynamic>));
  }

  Future<User> me() async =>
      User.fromJson((await _get('/api/auth/me'))['user'] as Map<String, dynamic>);

  Future<User> updateMe(Map<String, dynamic> body) async =>
      User.fromJson((await _patch('/api/auth/me', body))['user'] as Map<String, dynamic>);

  Future<bool> health() async {
    final data = await _get('/api/health');
    return data['status'] == 'ok';
  }

  // ---- Dashboard ----
  Future<Dashboard> dashboard() async => Dashboard.fromJson(await _get('/api/dashboard'));

  // ---- Projects ----
  Future<List<Project>> projects({String? status}) async {
    final data = await _get('/api/projects', {'status': ?status});
    return (data['projects'] as List<dynamic>)
        .map((p) => Project.fromJson(p as Map<String, dynamic>))
        .toList();
  }

  Future<ProjectDetail> project(String id) async =>
      ProjectDetail.fromJson(await _get('/api/projects/$id'));

  Future<Project> createProject(Map<String, dynamic> body) async =>
      Project.fromJson((await _post('/api/projects', body))['project'] as Map<String, dynamic>);

  Future<Project> updateProject(String id, Map<String, dynamic> body) async => Project.fromJson(
    (await _patch('/api/projects/$id', body))['project'] as Map<String, dynamic>,
  );

  Future<void> deleteProject(String id) => _delete('/api/projects/$id');

  Future<void> createMilestone(String projectId, Map<String, dynamic> body) =>
      _post('/api/projects/$projectId/milestones', body);

  // ---- Tasks ----
  Future<TaskListResult> tasks({String? date, bool backlog = false, String? project}) async {
    final data = await _get('/api/tasks', {
      'date': ?date,
      if (backlog) 'backlog': 'true',
      'project': ?project,
    });
    return TaskListResult(
      (data['tasks'] as List<dynamic>)
          .map((t) => Task.fromJson(t as Map<String, dynamic>))
          .toList(),
      data['today'] as String,
    );
  }

  Future<Task> createTask(TaskInput input) async =>
      Task.fromJson((await _post('/api/tasks', input.toJson()))['task'] as Map<String, dynamic>);

  Future<Task> updateTask(String id, TaskInput input) async => Task.fromJson(
    (await _patch('/api/tasks/$id', input.toJson()))['task'] as Map<String, dynamic>,
  );

  Future<void> deleteTask(String id) => _delete('/api/tasks/$id');

  Future<int> rollover() async =>
      ((await _post('/api/tasks/rollover'))['rolledOver'] as num).toInt();

  Future<AutoScheduleResult> autoSchedule(String date) async {
    final data = await _post('/api/tasks/auto-schedule', {'date': date});
    return AutoScheduleResult(
      (data['placed'] as num).toInt(),
      (data['unplaced'] as List<dynamic>).length,
      (data['tasks'] as List<dynamic>)
          .map((t) => Task.fromJson(t as Map<String, dynamic>))
          .toList(),
    );
  }

  // ---- AI ----
  Future<Plan> generatePlan(String prompt, {String? deadline}) async {
    final data = await _post('/api/ai/plan', {'prompt': prompt, 'deadline': ?deadline});
    return Plan.fromJson(data['plan'] as Map<String, dynamic>);
  }

  Future<Project> createFromPlan(
    Plan plan, {
    String? prompt,
    String? deadline,
    String? color,
  }) async {
    final data = await _post('/api/ai/projects', {
      'plan': plan.toJson(),
      'prompt': ?prompt,
      'deadline': ?deadline,
      'color': ?color,
    });
    return Project.fromJson(data['project'] as Map<String, dynamic>);
  }
}
