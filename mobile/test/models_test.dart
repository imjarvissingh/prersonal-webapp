import 'package:dev_tracker/models/dashboard.dart';
import 'package:dev_tracker/models/plan.dart';
import 'package:dev_tracker/models/project.dart';
import 'package:dev_tracker/models/task.dart';
import 'package:dev_tracker/utils/dates.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Task', () {
    test('parses populated and bare project references', () {
      final populated = Task.fromJson({
        'id': 't1',
        'title': 'Write docs',
        'status': 'in_progress',
        'energy': 'high',
        'priority': 'low',
        'estimateMinutes': 45,
        'scheduledDate': '2026-10-12',
        'timeBlock': {'start': '09:00', 'end': '09:45'},
        'project': {'id': 'p1', 'title': 'Launch', 'color': '#10b981'},
        'rolloverCount': 2,
      });
      expect(populated.status, TaskStatus.inProgress);
      expect(populated.energy, Level.high);
      expect(populated.timeBlock!.end, '09:45');
      expect(populated.project!.title, 'Launch');
      expect(populated.rolloverCount, 2);

      final bare = Task.fromJson({'id': 't2', 'title': 'x', 'project': 'p9'});
      expect(bare.project!.id, 'p9');
      expect(bare.status, TaskStatus.todo);
    });

    test('isOverdue only counts open tasks with a past due date', () {
      const open = Task(id: 'a', title: 'a', dueDate: '2026-10-01');
      const done = Task(id: 'b', title: 'b', dueDate: '2026-10-01', status: TaskStatus.done);
      expect(open.isOverdue('2026-10-12'), isTrue);
      expect(done.isOverdue('2026-10-12'), isFalse);
      expect(open.isOverdue('2026-09-30'), isFalse);
    });

    test('TaskInput sends explicit nulls for cleared fields', () {
      const input = TaskInput(status: TaskStatus.done, clear: {'scheduledDate', 'timeBlock'});
      expect(input.toJson(), {'status': 'done', 'scheduledDate': null, 'timeBlock': null});
    });
  });

  test('Project parses health stats', () {
    final p = Project.fromJson({
      'id': 'p1',
      'title': 'API',
      'stats': {
        'total': 10,
        'done': 4,
        'progress': 40,
        'expectedProgress': 60,
        'health': 'red',
        'reasons': ['20 points behind schedule'],
      },
    });
    expect(p.stats.health, Health.red);
    expect(p.stats.expectedProgress, 60);
    expect(p.stats.reasons.single, contains('behind'));
  });

  test('Plan round-trips through JSON', () {
    final plan = Plan.fromJson({
      'title': 'Blog',
      'description': 'Ship it',
      'milestones': [
        {
          'title': 'Design',
          'durationDays': 3,
          'tasks': [
            {'title': 'Sketch', 'energy': 'high', 'priority': 'high', 'estimateMinutes': 60},
            {'title': 'Pick fonts', 'energy': 'low', 'priority': 'low', 'estimateMinutes': 15},
          ],
        },
      ],
    });
    expect(plan.taskCount, 2);
    expect(plan.totalMinutes, 75);
    final json = plan.toJson();
    expect((json['milestones'] as List).first['tasks'][1]['energy'], 'low');
  });

  test('Dashboard parses the API summary', () {
    final d = Dashboard.fromJson({
      'today': '2026-10-12',
      'overall': {
        'progress': 50,
        'totalTasks': 4,
        'doneTasks': 2,
        'overdueTasks': 1,
        'backlogTasks': 3,
        'completedThisWeek': 5,
        'activeProjects': 1,
        'healthCounts': {'green': 1, 'yellow': 0, 'red': 0},
      },
      'todaySummary': {
        'total': 2,
        'done': 1,
        'progress': 50,
        'plannedMinutes': 90,
        'doneMinutes': 30,
        'rolledOver': 1,
        'energy': {
          'low': {'total': 0, 'done': 0},
          'medium': {'total': 1, 'done': 1},
          'high': {'total': 1, 'done': 0},
        },
      },
      'todayTasks': [],
      'activity': [
        {'date': '2026-10-12', 'completed': 3},
      ],
      'projects': [],
    });
    expect(d.healthCounts[Health.green], 1);
    expect(d.energy[Level.high]!.total, 1);
    expect(d.activity.single.completed, 3);
  });

  group('DateKeys', () {
    test('adds days across months and labels relative days', () {
      expect(DateKeys.addDays('2026-12-31', 1), '2027-01-01');
      expect(DateKeys.addDays('2026-03-01', -1), '2026-02-28');
      expect(DateKeys.label('2026-10-12', today: '2026-10-12'), 'Today');
      expect(DateKeys.label('2026-10-13', today: '2026-10-12'), 'Tomorrow');
      expect(DateKeys.label('2026-10-11', today: '2026-10-12'), 'Yesterday');
    });

    test('formatMinutes', () {
      expect(formatMinutes(45), '45m');
      expect(formatMinutes(60), '1h');
      expect(formatMinutes(95), '1h 35m');
    });
  });
}
