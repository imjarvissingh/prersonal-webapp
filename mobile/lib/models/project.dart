import 'task.dart';

enum Health { green, yellow, red }

Health healthFromApi(String? value) => switch (value) {
  'red' => Health.red,
  'yellow' => Health.yellow,
  _ => Health.green,
};

class ProjectStats {
  final int total;
  final int done;
  final int inProgress;
  final int overdue;
  final int progress;
  final int? expectedProgress;
  final Health health;
  final List<String> reasons;

  const ProjectStats({
    this.total = 0,
    this.done = 0,
    this.inProgress = 0,
    this.overdue = 0,
    this.progress = 0,
    this.expectedProgress,
    this.health = Health.green,
    this.reasons = const [],
  });

  factory ProjectStats.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const ProjectStats();
    return ProjectStats(
      total: (json['total'] as num?)?.toInt() ?? 0,
      done: (json['done'] as num?)?.toInt() ?? 0,
      inProgress: (json['inProgress'] as num?)?.toInt() ?? 0,
      overdue: (json['overdue'] as num?)?.toInt() ?? 0,
      progress: (json['progress'] as num?)?.toInt() ?? 0,
      expectedProgress: (json['expectedProgress'] as num?)?.toInt(),
      health: healthFromApi(json['health'] as String?),
      reasons: (json['reasons'] as List<dynamic>? ?? []).cast<String>(),
    );
  }
}

class Project {
  final String id;
  final String title;
  final String description;
  final String status;
  final String color;
  final String? startDate;
  final String? dueDate;
  final bool aiGenerated;
  final ProjectStats stats;

  const Project({
    required this.id,
    required this.title,
    this.description = '',
    this.status = 'active',
    this.color = '#6366f1',
    this.startDate,
    this.dueDate,
    this.aiGenerated = false,
    this.stats = const ProjectStats(),
  });

  factory Project.fromJson(Map<String, dynamic> json) => Project(
    id: json['id'] as String,
    title: json['title'] as String? ?? '',
    description: json['description'] as String? ?? '',
    status: json['status'] as String? ?? 'active',
    color: json['color'] as String? ?? '#6366f1',
    startDate: json['startDate'] as String?,
    dueDate: json['dueDate'] as String?,
    aiGenerated: json['aiGenerated'] as bool? ?? false,
    stats: ProjectStats.fromJson(json['stats'] as Map<String, dynamic>?),
  );
}

class Milestone {
  final String id;
  final String title;
  final String description;
  final String? dueDate;
  final ProjectStats stats;

  const Milestone({
    required this.id,
    required this.title,
    this.description = '',
    this.dueDate,
    this.stats = const ProjectStats(),
  });

  factory Milestone.fromJson(Map<String, dynamic> json) => Milestone(
    id: json['id'] as String,
    title: json['title'] as String? ?? '',
    description: json['description'] as String? ?? '',
    dueDate: json['dueDate'] as String?,
    stats: ProjectStats.fromJson(json['stats'] as Map<String, dynamic>?),
  );
}

class ProjectDetail {
  final Project project;
  final List<Milestone> milestones;
  final List<Task> tasks;

  const ProjectDetail({required this.project, required this.milestones, required this.tasks});

  factory ProjectDetail.fromJson(Map<String, dynamic> json) => ProjectDetail(
    project: Project.fromJson(json['project'] as Map<String, dynamic>),
    milestones: (json['milestones'] as List<dynamic>)
        .map((m) => Milestone.fromJson(m as Map<String, dynamic>))
        .toList(),
    tasks: (json['tasks'] as List<dynamic>)
        .map((t) => Task.fromJson(t as Map<String, dynamic>))
        .toList(),
  );
}
