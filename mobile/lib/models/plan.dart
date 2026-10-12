import 'task.dart';

class PlanTask {
  String title;
  String notes;
  Level priority;
  Level energy;
  int estimateMinutes;

  PlanTask({
    required this.title,
    this.notes = '',
    this.priority = Level.medium,
    this.energy = Level.medium,
    this.estimateMinutes = 30,
  });

  factory PlanTask.fromJson(Map<String, dynamic> json) => PlanTask(
    title: json['title'] as String? ?? '',
    notes: json['notes'] as String? ?? '',
    priority: levelFromApi(json['priority'] as String?),
    energy: levelFromApi(json['energy'] as String?),
    estimateMinutes: (json['estimateMinutes'] as num?)?.toInt() ?? 30,
  );

  Map<String, dynamic> toJson() => {
    'title': title,
    'notes': notes,
    'priority': priority.name,
    'energy': energy.name,
    'estimateMinutes': estimateMinutes,
  };
}

class PlanMilestone {
  String title;
  String description;
  int durationDays;
  List<PlanTask> tasks;

  PlanMilestone({
    required this.title,
    this.description = '',
    this.durationDays = 7,
    required this.tasks,
  });

  factory PlanMilestone.fromJson(Map<String, dynamic> json) => PlanMilestone(
    title: json['title'] as String? ?? '',
    description: json['description'] as String? ?? '',
    durationDays: (json['durationDays'] as num?)?.toInt() ?? 7,
    tasks: (json['tasks'] as List<dynamic>? ?? [])
        .map((t) => PlanTask.fromJson(t as Map<String, dynamic>))
        .toList(),
  );

  Map<String, dynamic> toJson() => {
    'title': title,
    'description': description,
    'durationDays': durationDays,
    'tasks': tasks.map((t) => t.toJson()).toList(),
  };
}

/// An AI-generated project plan the user can edit before saving.
class Plan {
  String title;
  String description;
  List<PlanMilestone> milestones;

  Plan({required this.title, this.description = '', required this.milestones});

  factory Plan.fromJson(Map<String, dynamic> json) => Plan(
    title: json['title'] as String? ?? '',
    description: json['description'] as String? ?? '',
    milestones: (json['milestones'] as List<dynamic>? ?? [])
        .map((m) => PlanMilestone.fromJson(m as Map<String, dynamic>))
        .toList(),
  );

  Map<String, dynamic> toJson() => {
    'title': title,
    'description': description,
    'milestones': milestones.map((m) => m.toJson()).toList(),
  };

  int get taskCount => milestones.fold(0, (sum, m) => sum + m.tasks.length);

  int get totalMinutes =>
      milestones.fold(0, (sum, m) => sum + m.tasks.fold(0, (s, t) => s + t.estimateMinutes));
}
