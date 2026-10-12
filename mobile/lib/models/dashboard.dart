import 'project.dart';
import 'task.dart';

class EnergyCount {
  final int total;
  final int done;
  const EnergyCount(this.total, this.done);

  factory EnergyCount.fromJson(Map<String, dynamic>? json) =>
      EnergyCount((json?['total'] as num?)?.toInt() ?? 0, (json?['done'] as num?)?.toInt() ?? 0);
}

class DayActivity {
  final String date;
  final int completed;
  const DayActivity(this.date, this.completed);
}

class Dashboard {
  final String today;
  final int overallProgress;
  final int totalTasks;
  final int doneTasks;
  final int overdueTasks;
  final int backlogTasks;
  final int completedThisWeek;
  final int activeProjects;
  final Map<Health, int> healthCounts;
  final int todayTotal;
  final int todayDone;
  final int todayProgress;
  final int plannedMinutes;
  final int doneMinutes;
  final int rolledOver;
  final Map<Level, EnergyCount> energy;
  final List<Task> todayTasks;
  final List<DayActivity> activity;
  final List<Project> projects;

  const Dashboard({
    required this.today,
    required this.overallProgress,
    required this.totalTasks,
    required this.doneTasks,
    required this.overdueTasks,
    required this.backlogTasks,
    required this.completedThisWeek,
    required this.activeProjects,
    required this.healthCounts,
    required this.todayTotal,
    required this.todayDone,
    required this.todayProgress,
    required this.plannedMinutes,
    required this.doneMinutes,
    required this.rolledOver,
    required this.energy,
    required this.todayTasks,
    required this.activity,
    required this.projects,
  });

  factory Dashboard.fromJson(Map<String, dynamic> json) {
    final overall = json['overall'] as Map<String, dynamic>;
    final today = json['todaySummary'] as Map<String, dynamic>;
    final health = overall['healthCounts'] as Map<String, dynamic>? ?? {};
    final energy = today['energy'] as Map<String, dynamic>? ?? {};
    int n(Map<String, dynamic> m, String k) => (m[k] as num?)?.toInt() ?? 0;

    return Dashboard(
      today: json['today'] as String,
      overallProgress: n(overall, 'progress'),
      totalTasks: n(overall, 'totalTasks'),
      doneTasks: n(overall, 'doneTasks'),
      overdueTasks: n(overall, 'overdueTasks'),
      backlogTasks: n(overall, 'backlogTasks'),
      completedThisWeek: n(overall, 'completedThisWeek'),
      activeProjects: n(overall, 'activeProjects'),
      healthCounts: {
        Health.green: n(health, 'green'),
        Health.yellow: n(health, 'yellow'),
        Health.red: n(health, 'red'),
      },
      todayTotal: n(today, 'total'),
      todayDone: n(today, 'done'),
      todayProgress: n(today, 'progress'),
      plannedMinutes: n(today, 'plannedMinutes'),
      doneMinutes: n(today, 'doneMinutes'),
      rolledOver: n(today, 'rolledOver'),
      energy: {
        for (final level in Level.values)
          level: EnergyCount.fromJson(energy[level.name] as Map<String, dynamic>?),
      },
      todayTasks: (json['todayTasks'] as List<dynamic>)
          .map((t) => Task.fromJson(t as Map<String, dynamic>))
          .toList(),
      activity: (json['activity'] as List<dynamic>)
          .map(
            (a) => DayActivity(
              (a as Map<String, dynamic>)['date'] as String,
              (a['completed'] as num).toInt(),
            ),
          )
          .toList(),
      projects: (json['projects'] as List<dynamic>)
          .map((p) => Project.fromJson(p as Map<String, dynamic>))
          .toList(),
    );
  }
}
