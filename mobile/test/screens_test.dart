import 'dart:convert';

import 'package:dev_tracker/main.dart';
import 'package:dev_tracker/services/api_client.dart';
import 'package:dev_tracker/services/secure_store.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

const today = '2026-10-12';

final project = {
  'id': 'p1',
  'title': 'Launch blog',
  'description': 'Ship a personal blog',
  'status': 'active',
  'color': '#10b981',
  'startDate': '2026-10-01',
  'dueDate': '2026-10-30',
  'aiGenerated': true,
  'stats': {
    'total': 2,
    'done': 1,
    'inProgress': 0,
    'overdue': 0,
    'stalled': 0,
    'progress': 50,
    'expectedProgress': 38,
    'health': 'green',
    'reasons': ['On track'],
  },
};

Map<String, dynamic> task(String id, {String status = 'todo', String? milestone}) => {
  'id': id,
  'title': 'Task $id',
  'status': status,
  'energy': 'high',
  'priority': 'medium',
  'estimateMinutes': 45,
  'scheduledDate': today,
  'timeBlock': id == 't1' ? {'start': '09:00', 'end': '09:45'} : null,
  'project': {'id': 'p1', 'title': 'Launch blog', 'color': '#10b981'},
  'milestone': milestone,
  'rolloverCount': id == 't2' ? 1 : 0,
};

http.Response json(Object body) => http.Response(jsonEncode(body), 200);

Future<http.Response> handler(http.Request req) async {
  switch (req.url.path) {
    case '/api/auth/me':
      return json({
        'user': {
          'id': 'u1',
          'name': 'Jarvis Singh',
          'email': 'j@example.com',
          'dayStart': '09:00',
          'dayEnd': '18:00',
        },
      });
    case '/api/tasks/rollover':
      return json({'today': today, 'rolledOver': 0});
    case '/api/dashboard':
      return json({
        'today': today,
        'overall': {
          'progress': 50,
          'totalTasks': 2,
          'doneTasks': 1,
          'overdueTasks': 0,
          'backlogTasks': 1,
          'completedThisWeek': 3,
          'activeProjects': 1,
          'healthCounts': {'green': 1, 'yellow': 0, 'red': 0},
        },
        'todaySummary': {
          'total': 2,
          'done': 1,
          'progress': 50,
          'plannedMinutes': 90,
          'doneMinutes': 45,
          'rolledOver': 1,
          'energy': {
            'low': {'total': 0, 'done': 0},
            'medium': {'total': 0, 'done': 0},
            'high': {'total': 2, 'done': 1},
          },
        },
        'todayTasks': [task('t1'), task('t2', status: 'done')],
        'activity': [
          for (var i = 6; i >= 0; i--) {'date': '2026-10-${12 - i}', 'completed': i % 3},
        ],
        'projects': [project],
      });
    case '/api/tasks':
      return json({
        'today': today,
        'tasks': req.url.queryParameters['backlog'] == 'true'
            ? [
                {...task('b1'), 'scheduledDate': null},
              ]
            : [task('t1'), task('t2', status: 'done')],
      });
    case '/api/projects':
      return json({
        'projects': [project],
      });
    case '/api/projects/p1':
      return json({
        'project': project,
        'milestones': [
          {
            'id': 'm1',
            'project': 'p1',
            'title': 'Design',
            'description': 'Look and feel',
            'dueDate': '2026-10-15',
            'stats': {
              'total': 1,
              'done': 1,
              'inProgress': 0,
              'overdue': 0,
              'stalled': 0,
              'progress': 100,
            },
          },
        ],
        'tasks': [task('t1', milestone: 'm1'), task('t3')],
      });
  }
  return http.Response(jsonEncode({'error': 'not found'}), 404);
}

void main() {
  // iPhone 15 and iPhone SE logical sizes.
  for (final (name, size, ratio) in [
    ('iPhone 15', const Size(1179, 2556), 3.0),
    ('iPhone SE', const Size(750, 1334), 2.0),
  ]) {
    testWidgets('signed-in user can visit every tab and screen on $name', (tester) async {
      tester.view.physicalSize = size;
      tester.view.devicePixelRatio = ratio;
      addTearDown(tester.view.reset);
      await _visitEverything(tester);
    });
  }
}

Future<void> _visitEverything(WidgetTester tester) async {
  {
    FlutterSecureStorage.setMockInitialValues({'devtracker.token': 'abc'});
    final api = ApiClient(baseUrl: 'http://api.test', httpClient: MockClient(handler));
    await tester.pumpWidget(DevTrackerApp(api: api, store: SecureStore()));
    await tester.pumpAndSettle();

    // Dashboard
    expect(find.textContaining('Jarvis'), findsOneWidget);
    expect(find.text('Overall progress'.toUpperCase()), findsOneWidget);

    // Today
    await tester.tap(find.text('Today').last);
    await tester.pumpAndSettle();
    expect(find.text('Auto time-block'), findsOneWidget);
    expect(find.textContaining('09:00–09:45'), findsOneWidget);
    await tester.tap(find.textContaining('Backlog ('));
    await tester.pumpAndSettle();
    expect(find.text('Task b1'), findsOneWidget);
    await tester.tapAt(const Offset(10, 10));
    await tester.pumpAndSettle();

    // Task editor opens from the FAB
    await tester.tap(find.byTooltip('New task'));
    await tester.pumpAndSettle();
    expect(find.text('New task'), findsWidgets);
    await tester.ensureVisible(find.text('Cancel'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();

    // Projects and detail
    await tester.tap(find.text('Projects').last);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Launch blog').first);
    await tester.pumpAndSettle();
    expect(find.text('Design'), findsOneWidget);
    expect(find.text('Other tasks'), findsOneWidget);
    await tester.pageBack();
    await tester.pumpAndSettle();

    // New AI project screen
    await tester.tap(find.text('New project'));
    await tester.pumpAndSettle();
    expect(find.text('Generate plan'), findsOneWidget);
    await tester.pageBack();
    await tester.pumpAndSettle();

    // Settings
    await tester.tap(find.text('Settings').last);
    await tester.pumpAndSettle();
    expect(find.text('Sign out'), findsOneWidget);
  }
}
