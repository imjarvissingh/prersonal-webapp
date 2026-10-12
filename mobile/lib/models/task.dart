enum TaskStatus { todo, inProgress, done }

enum Level { low, medium, high }

TaskStatus taskStatusFromApi(String? value) => switch (value) {
  'in_progress' => TaskStatus.inProgress,
  'done' => TaskStatus.done,
  _ => TaskStatus.todo,
};

String taskStatusToApi(TaskStatus status) => switch (status) {
  TaskStatus.todo => 'todo',
  TaskStatus.inProgress => 'in_progress',
  TaskStatus.done => 'done',
};

Level levelFromApi(String? value) => switch (value) {
  'low' => Level.low,
  'high' => Level.high,
  _ => Level.medium,
};

class TimeBlock {
  final String start;
  final String end;

  const TimeBlock({required this.start, required this.end});

  factory TimeBlock.fromJson(Map<String, dynamic> json) =>
      TimeBlock(start: json['start'] as String, end: json['end'] as String);

  Map<String, dynamic> toJson() => {'start': start, 'end': end};
}

class ProjectRef {
  final String id;
  final String title;
  final String color;

  const ProjectRef({required this.id, required this.title, required this.color});

  /// The API returns either a populated `{id, title, color}` object or a bare id.
  static ProjectRef? fromJson(dynamic json) {
    if (json is Map<String, dynamic>) {
      return ProjectRef(
        id: json['id'] as String,
        title: json['title'] as String? ?? '',
        color: json['color'] as String? ?? '#6366f1',
      );
    }
    if (json is String) return ProjectRef(id: json, title: '', color: '#6366f1');
    return null;
  }
}

class Task {
  final String id;
  final String title;
  final String notes;
  final TaskStatus status;
  final Level priority;
  final Level energy;
  final int estimateMinutes;
  final String? scheduledDate;
  final TimeBlock? timeBlock;
  final String? dueDate;
  final ProjectRef? project;
  final String? milestone;
  final int order;
  final int rolloverCount;
  final String? originalDate;

  const Task({
    required this.id,
    required this.title,
    this.notes = '',
    this.status = TaskStatus.todo,
    this.priority = Level.medium,
    this.energy = Level.medium,
    this.estimateMinutes = 30,
    this.scheduledDate,
    this.timeBlock,
    this.dueDate,
    this.project,
    this.milestone,
    this.order = 0,
    this.rolloverCount = 0,
    this.originalDate,
  });

  bool get isDone => status == TaskStatus.done;

  bool isOverdue(String today) => !isDone && dueDate != null && dueDate!.compareTo(today) < 0;

  factory Task.fromJson(Map<String, dynamic> json) => Task(
    id: json['id'] as String,
    title: json['title'] as String? ?? '',
    notes: json['notes'] as String? ?? '',
    status: taskStatusFromApi(json['status'] as String?),
    priority: levelFromApi(json['priority'] as String?),
    energy: levelFromApi(json['energy'] as String?),
    estimateMinutes: (json['estimateMinutes'] as num?)?.toInt() ?? 0,
    scheduledDate: json['scheduledDate'] as String?,
    timeBlock: json['timeBlock'] is Map<String, dynamic>
        ? TimeBlock.fromJson(json['timeBlock'] as Map<String, dynamic>)
        : null,
    dueDate: json['dueDate'] as String?,
    project: ProjectRef.fromJson(json['project']),
    milestone: json['milestone'] as String?,
    order: (json['order'] as num?)?.toInt() ?? 0,
    rolloverCount: (json['rolloverCount'] as num?)?.toInt() ?? 0,
    originalDate: json['originalDate'] as String?,
  );

  Task copyWith({TaskStatus? status}) => Task(
    id: id,
    title: title,
    notes: notes,
    status: status ?? this.status,
    priority: priority,
    energy: energy,
    estimateMinutes: estimateMinutes,
    scheduledDate: scheduledDate,
    timeBlock: timeBlock,
    dueDate: dueDate,
    project: project,
    milestone: milestone,
    order: order,
    rolloverCount: rolloverCount,
    originalDate: originalDate,
  );
}

/// Fields sent when creating or updating a task. `null` values in [clear]
/// are sent explicitly so the API unsets them.
class TaskInput {
  final String? title;
  final String? notes;
  final TaskStatus? status;
  final Level? priority;
  final Level? energy;
  final int? estimateMinutes;
  final String? scheduledDate;
  final TimeBlock? timeBlock;
  final String? dueDate;
  final String? project;
  final String? milestone;
  final Set<String> clear;

  const TaskInput({
    this.title,
    this.notes,
    this.status,
    this.priority,
    this.energy,
    this.estimateMinutes,
    this.scheduledDate,
    this.timeBlock,
    this.dueDate,
    this.project,
    this.milestone,
    this.clear = const {},
  });

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{
      if (title != null) 'title': title,
      if (notes != null) 'notes': notes,
      if (status != null) 'status': taskStatusToApi(status!),
      if (priority != null) 'priority': priority!.name,
      if (energy != null) 'energy': energy!.name,
      if (estimateMinutes != null) 'estimateMinutes': estimateMinutes,
      if (scheduledDate != null) 'scheduledDate': scheduledDate,
      if (timeBlock != null) 'timeBlock': timeBlock!.toJson(),
      if (dueDate != null) 'dueDate': dueDate,
      if (project != null) 'project': project,
      if (milestone != null) 'milestone': milestone,
    };
    for (final field in clear) {
      json[field] = null;
    }
    return json;
  }
}
