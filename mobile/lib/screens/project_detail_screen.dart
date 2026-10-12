import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/project.dart';
import '../models/task.dart';
import '../services/api_client.dart';
import '../utils/dates.dart';
import '../widgets/common.dart';
import '../widgets/task_editor_sheet.dart';
import '../widgets/task_tile.dart';

class ProjectDetailScreen extends StatefulWidget {
  const ProjectDetailScreen({super.key, required this.projectId});

  final String projectId;

  @override
  State<ProjectDetailScreen> createState() => _ProjectDetailScreenState();
}

class _ProjectDetailScreenState extends State<ProjectDetailScreen> {
  ProjectDetail? _detail;
  String? _error;
  bool _showDone = true;

  ApiClient get _api => context.read<ApiClient>();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final detail = await _api.project(widget.projectId);
      if (mounted) {
        setState(() {
          _detail = detail;
          _error = null;
        });
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  Future<void> _run(Future<void> Function() action) async {
    try {
      await action();
      await _load();
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message);
    }
  }

  Future<void> _editTask(Task? task, {String? milestone}) async {
    final detail = _detail!;
    final result = await showTaskEditor(
      context,
      task: task,
      projectId: detail.project.id,
      defaultMilestone: milestone,
      milestones: detail.milestones,
    );
    if (result == null) return;
    await _run(() async {
      if (result.delete && task != null) {
        await _api.deleteTask(task.id);
      } else if (task == null) {
        await _api.createTask(result.input!);
      } else {
        await _api.updateTask(task.id, result.input!);
      }
    });
  }

  Future<void> _addMilestone() async {
    final controller = TextEditingController();
    final title = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('New milestone'),
        content: TextField(
          controller: controller,
          autofocus: true,
          textCapitalization: TextCapitalization.sentences,
          decoration: const InputDecoration(labelText: 'Title'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, controller.text.trim()),
            child: const Text('Add'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (title == null || title.isEmpty) return;
    await _run(() => _api.createMilestone(widget.projectId, {'title': title}));
  }

  Future<void> _setStatus(String status) =>
      _run(() => _api.updateProject(widget.projectId, {'status': status}));

  Future<void> _delete() async {
    final navigator = Navigator.of(context);
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete project?'),
        content: const Text('This removes the project with all of its milestones and tasks.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Delete')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await _api.deleteProject(widget.projectId);
      navigator.pop();
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message);
    }
  }

  Widget _taskRow(Task task, String today) => TaskTile(
    task: task,
    today: today,
    showProject: false,
    onStatus: (s) => _run(() => _api.updateTask(task.id, TaskInput(status: s))),
    onTap: () => _editTask(task),
    trailing: !task.isDone && task.scheduledDate == null
        ? IconButton(
            tooltip: 'Plan for today',
            icon: const Icon(Icons.today_outlined, size: 20),
            onPressed: () => _run(() => _api.updateTask(task.id, TaskInput(scheduledDate: today))),
          )
        : null,
  );

  @override
  Widget build(BuildContext context) {
    final detail = _detail;
    final theme = Theme.of(context);
    final muted = theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline);
    final today = DateKeys.today();

    if (detail == null) {
      return Scaffold(
        appBar: AppBar(),
        body: Padding(
          padding: const EdgeInsets.all(16),
          child: _error != null
              ? ErrorBanner(message: _error!, onRetry: _load)
              : const Center(child: CircularProgressIndicator()),
        ),
      );
    }

    final project = detail.project;
    final s = project.stats;
    final tasks = _showDone ? detail.tasks : detail.tasks.where((t) => !t.isDone).toList();
    final milestoneIds = detail.milestones.map((m) => m.id).toSet();
    final ungrouped = tasks
        .where((t) => t.milestone == null || !milestoneIds.contains(t.milestone))
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: Text(project.title, overflow: TextOverflow.ellipsis),
        actions: [
          PopupMenuButton<String>(
            onSelected: (v) => v == 'delete' ? _delete() : _setStatus(v),
            itemBuilder: (_) => [
              for (final (value, label) in const [
                ('active', 'Mark active'),
                ('on_hold', 'Put on hold'),
                ('completed', 'Mark completed'),
                ('archived', 'Archive'),
              ])
                if (value != project.status) PopupMenuItem(value: value, child: Text(label)),
              const PopupMenuDivider(),
              const PopupMenuItem(value: 'delete', child: Text('Delete project')),
            ],
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: null,
        tooltip: 'New task',
        onPressed: () => _editTask(null),
        child: const Icon(Icons.add),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 96),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (project.description.isNotEmpty) ...[
                      Text(project.description),
                      const SizedBox(height: 8),
                    ],
                    Text(
                      [
                        if (project.startDate != null)
                          'Started ${DateKeys.short(project.startDate!)}',
                        if (project.dueDate != null) 'Due ${DateKeys.short(project.dueDate!)}',
                        if (project.status != 'active') project.status.replaceAll('_', ' '),
                        if (project.aiGenerated) '✨ Gemini plan',
                      ].join(' · '),
                      style: muted,
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        HealthBadge(health: s.health),
                        const Spacer(),
                        Text('${s.progress}%', style: theme.textTheme.titleMedium),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ProgressTrack(
                      value: s.progress,
                      color: healthColors[s.health],
                      expected: s.expectedProgress,
                      height: 10,
                    ),
                    const SizedBox(height: 8),
                    Text(s.reasons.join(' · '), style: muted),
                    const SizedBox(height: 4),
                    Text(
                      '${s.done}/${s.total} done · ${s.inProgress} in progress'
                      '${s.overdue > 0 ? ' · ${s.overdue} overdue' : ''}'
                      '${s.expectedProgress != null ? ' · expected ${s.expectedProgress}%' : ''}',
                      style: muted,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(child: Text('Milestones', style: theme.textTheme.titleMedium)),
                FilterChip(
                  label: const Text('Show done'),
                  selected: _showDone,
                  onSelected: (v) => setState(() => _showDone = v),
                ),
                IconButton(
                  tooltip: 'Add milestone',
                  onPressed: _addMilestone,
                  icon: const Icon(Icons.playlist_add),
                ),
              ],
            ),
            for (final (i, m) in detail.milestones.indexed) ...[
              const SizedBox(height: 8),
              Card(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          CircleAvatar(
                            radius: 12,
                            backgroundColor: theme.colorScheme.primaryContainer,
                            child: Text(
                              '${i + 1}',
                              style: TextStyle(
                                fontSize: 12,
                                color: theme.colorScheme.onPrimaryContainer,
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(m.title, style: theme.textTheme.titleSmall),
                                if (m.description.isNotEmpty) Text(m.description, style: muted),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              if (m.dueDate != null)
                                Text(
                                  'Due ${DateKeys.short(m.dueDate!)}',
                                  style: m.dueDate!.compareTo(today) < 0 && m.stats.progress < 100
                                      ? muted?.copyWith(color: theme.colorScheme.error)
                                      : muted,
                                ),
                              Text(
                                '${m.stats.done}/${m.stats.total} · ${m.stats.progress}%',
                                style: muted,
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      ProgressTrack(
                        value: m.stats.progress,
                        height: 6,
                        color: m.stats.overdue > 0 ? healthColors[Health.red] : null,
                      ),
                      const SizedBox(height: 6),
                      for (final t in tasks.where((t) => t.milestone == m.id)) _taskRow(t, today),
                      TextButton.icon(
                        onPressed: () => _editTask(null, milestone: m.id),
                        icon: const Icon(Icons.add, size: 18),
                        label: const Text('Add task'),
                      ),
                    ],
                  ),
                ),
              ),
            ],
            if (ungrouped.isNotEmpty || detail.milestones.isEmpty) ...[
              const SizedBox(height: 12),
              Text(
                detail.milestones.isEmpty ? 'Tasks' : 'Other tasks',
                style: theme.textTheme.titleSmall,
              ),
              if (ungrouped.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Text('No tasks yet.', style: muted),
                ),
              for (final t in ungrouped) _taskRow(t, today),
            ],
          ],
        ),
      ),
    );
  }
}
