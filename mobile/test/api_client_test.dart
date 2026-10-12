import 'dart:convert';

import 'package:dev_tracker/models/task.dart';
import 'package:dev_tracker/services/api_client.dart';
import 'package:dev_tracker/state/today_provider.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

Map<String, dynamic> taskJson(String id, {String status = 'todo', Map<String, String>? block}) => {
  'id': id,
  'title': 'Task $id',
  'status': status,
  'energy': 'medium',
  'priority': 'medium',
  'estimateMinutes': 30,
  'scheduledDate': '2026-10-12',
  'timeBlock': block,
};

void main() {
  test('sends the bearer token and surfaces API errors', () async {
    late http.Request seen;
    final client = ApiClient(
      baseUrl: 'http://api.test/',
      httpClient: MockClient((req) async {
        seen = req;
        return http.Response(jsonEncode({'error': 'Project not found'}), 404);
      }),
    )..token = 'abc';

    await expectLater(
      client.project('p1'),
      throwsA(isA<ApiException>().having((e) => e.message, 'message', 'Project not found')),
    );
    expect(seen.url.toString(), 'http://api.test/api/projects/p1');
    expect(seen.headers['Authorization'], 'Bearer abc');
  });

  test('401 on an authenticated call triggers onUnauthorized', () async {
    var signedOut = false;
    final client =
        ApiClient(
            baseUrl: 'http://api.test',
            httpClient: MockClient(
              (_) async => http.Response(jsonEncode({'error': 'expired'}), 401),
            ),
          )
          ..token = 'abc'
          ..onUnauthorized = () => signedOut = true;

    await expectLater(client.dashboard(), throwsA(isA<ApiException>()));
    expect(signedOut, isTrue);
  });

  test('TodayProvider rolls over once, then loads the day and backlog', () async {
    final calls = <String>[];
    final client = ApiClient(
      baseUrl: 'http://api.test',
      httpClient: MockClient((req) async {
        calls.add('${req.method} ${req.url.path}?${req.url.query}');
        if (req.url.path == '/api/tasks/rollover') {
          return http.Response(jsonEncode({'today': '2026-10-12', 'rolledOver': 2}), 200);
        }
        if (req.url.queryParameters['backlog'] == 'true') {
          return http.Response(
            jsonEncode({
              'today': '2026-10-12',
              'tasks': [
                {...taskJson('b1'), 'scheduledDate': null},
              ],
            }),
            200,
          );
        }
        return http.Response(
          jsonEncode({
            'today': '2026-10-12',
            'tasks': [
              taskJson('t1', block: {'start': '10:00', 'end': '10:30'}),
              taskJson('t2', block: {'start': '09:00', 'end': '09:30'}),
              taskJson('t3', status: 'done'),
            ],
          }),
          200,
        );
      }),
    );

    final provider = TodayProvider(client)..date = '2026-10-12';
    await provider.load();
    await provider.load();

    expect(calls.where((c) => c.startsWith('POST /api/tasks/rollover')).length, 1);
    expect(provider.timeBlocked.map((t) => t.id), ['t2', 't1']);
    expect(provider.anytime.map((t) => t.id), ['t3']);
    expect(provider.doneCount, 1);
    expect(provider.backlog.single.id, 'b1');

    provider.setEnergyFilter(Level.high);
    expect(provider.visible, isEmpty);
  });
}
