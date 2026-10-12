import 'package:dev_tracker/main.dart';
import 'package:dev_tracker/models/project.dart';
import 'package:dev_tracker/models/task.dart';
import 'package:dev_tracker/services/api_client.dart';
import 'package:dev_tracker/services/secure_store.dart';
import 'package:dev_tracker/widgets/common.dart';
import 'package:dev_tracker/widgets/task_tile.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  testWidgets('signed-out users land on the sign-in screen', (tester) async {
    FlutterSecureStorage.setMockInitialValues({});
    final api = ApiClient(
      baseUrl: 'http://api.test',
      httpClient: MockClient((_) async => http.Response('{}', 200)),
    );
    await tester.pumpWidget(DevTrackerApp(api: api, store: SecureStore()));
    await tester.pumpAndSettle();

    expect(find.text('Dev Tracker'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Sign in'), findsOneWidget);

    await tester.tap(find.text('New here? Create an account'));
    await tester.pumpAndSettle();
    expect(find.widgetWithText(FilledButton, 'Create account'), findsOneWidget);
  });

  testWidgets('TaskTile shows the time block and toggles to done', (tester) async {
    TaskStatus? toggled;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: TaskTile(
            task: const Task(
              id: 't1',
              title: 'Review PR',
              energy: Level.high,
              timeBlock: TimeBlock(start: '09:00', end: '09:30'),
              rolloverCount: 1,
            ),
            onStatus: (s) => toggled = s,
          ),
        ),
      ),
    );

    expect(find.textContaining('09:00–09:30'), findsOneWidget);
    expect(find.text('↻ 1×'), findsOneWidget);
    await tester.tap(find.byTooltip('Mark as done'));
    expect(toggled, TaskStatus.done);
  });

  testWidgets('HealthBadge labels each health state', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Row(
          children: [
            HealthBadge(health: Health.green),
            HealthBadge(health: Health.yellow),
            HealthBadge(health: Health.red),
          ],
        ),
      ),
    );
    expect(find.text('On track'), findsOneWidget);
    expect(find.text('At risk'), findsOneWidget);
    expect(find.text('Off track'), findsOneWidget);
  });
}
