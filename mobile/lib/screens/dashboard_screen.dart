import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/dashboard.dart';
import '../models/project.dart';
import '../models/task.dart';
import '../state/auth_provider.dart';
import '../state/dashboard_provider.dart';
import '../utils/dates.dart';
import '../widgets/common.dart';
import '../widgets/project_card.dart';
import '../widgets/task_tile.dart';
import 'new_project_screen.dart';
import 'project_detail_screen.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<DashboardProvider>();
    final name = context.select<AuthProvider, String>((a) => a.user?.firstName ?? '');
    final data = provider.data;

    return Scaffold(
      appBar: AppBar(
        title: Text('${_greeting()}${name.isEmpty ? '' : ', $name'}'),
        actions: [
          IconButton(
            tooltip: 'New AI project',
            icon: const Icon(Icons.auto_awesome),
            onPressed: () async {
              final created = await Navigator.of(context)
                  .push<bool>(MaterialPageRoute(builder: (_) => const NewProjectScreen()));
              if (created == true) provider.load();
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: provider.load,
        child: data == null
            ? ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (provider.error != null)
                    ErrorBanner(message: provider.error!, onRetry: provider.load)
                  else
                    const Padding(
                      padding: EdgeInsets.only(top: 120),
                      child: Center(child: CircularProgressIndicator()),
                    ),
                ],
              )
            : _DashboardBody(data: data, provider: provider),
      ),
    );
  }
}

class _DashboardBody extends StatelessWidget {
  const _DashboardBody({required this.data, required this.provider});

  final Dashboard data;
  final DashboardProvider provider;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final muted = theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline);
    final open = data.todayTasks.where((t) => !t.isDone).toList();
    final done = data.todayTasks.where((t) => t.isDone).toList();
    final ordered = [...open, ...done].take(6).toList();
    final maxActivity = data.activity.fold<int>(1, (m, a) => a.completed > m ? a.completed : m);

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      children: [
        Text(
          data.todayTotal == 0
              ? 'Nothing planned for today yet.'
              : '${data.todayDone} of ${data.todayTotal} tasks done today'
                    '${data.rolledOver > 0 ? ' · ${data.rolledOver} rolled over' : ''}',
          style: muted,
        ),
        if (provider.error != null) ...[
          const SizedBox(height: 12),
          ErrorBanner(message: provider.error!, onRetry: provider.load),
        ],
        const SizedBox(height: 16),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 1.45,
          children: [
            _Stat(
              label: 'Overall progress',
              value: '${data.overallProgress}%',
              sub: '${data.doneTasks}/${data.totalTasks} tasks',
            ),
            _Stat(
              label: 'Today',
              value: '${data.todayProgress}%',
              sub: '${formatMinutes(data.doneMinutes)} of ${formatMinutes(data.plannedMinutes)}',
            ),
            _Stat(
              label: 'Done this week',
              value: '${data.completedThisWeek}',
              sub: '${data.backlogTasks} in backlog',
            ),
            _Stat(
              label: 'Overdue',
              value: '${data.overdueTasks}',
              sub: '${data.activeProjects} active projects',
              danger: data.overdueTasks > 0,
            ),
          ],
        ),
        const SizedBox(height: 20),
        Text("Today's focus", style: theme.textTheme.titleMedium),
        const SizedBox(height: 8),
        if (ordered.isEmpty)
          const EmptyState(
            title: 'Your day is a blank slate',
            body: 'Open the Today tab to pull tasks in from your backlog.',
          )
        else
          for (final task in ordered)
            TaskTile(task: task, today: data.today, onStatus: (s) => provider.setStatus(task, s)),
        const SizedBox(height: 20),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Energy budget', style: theme.textTheme.titleSmall),
                const SizedBox(height: 12),
                for (final level in [Level.high, Level.medium, Level.low]) ...[
                  Row(
                    children: [
                      EnergyChip(energy: level),
                      const Spacer(),
                      Text(
                        '${data.energy[level]!.done}/${data.energy[level]!.total}',
                        style: muted,
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  ProgressTrack(
                    value: data.energy[level]!.total == 0
                        ? 0
                        : (data.energy[level]!.done * 100 ~/ data.energy[level]!.total),
                    color: energyColors[level],
                    height: 6,
                  ),
                  const SizedBox(height: 12),
                ],
              ],
            ),
          ),
        ),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Last 7 days', style: theme.textTheme.titleSmall),
                const SizedBox(height: 12),
                SizedBox(
                  height: 110,
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      for (final a in data.activity)
                        Expanded(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 4),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                Text(a.completed == 0 ? '' : '${a.completed}', style: muted),
                                const SizedBox(height: 2),
                                Container(
                                  height: 4 + 70 * a.completed / maxActivity,
                                  decoration: BoxDecoration(
                                    color: a.date == data.today
                                        ? theme.colorScheme.primary
                                        : theme.colorScheme.primary.withValues(alpha: 0.3),
                                    borderRadius: const BorderRadius.vertical(
                                      top: Radius.circular(4),
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(DateKeys.weekdayLetter(a.date), style: muted),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                for (final h in Health.values)
                  Expanded(
                    child: Column(
                      children: [
                        Text(
                          '${data.healthCounts[h]}',
                          style: theme.textTheme.headlineSmall?.copyWith(color: healthColors[h]),
                        ),
                        Text(healthLabels[h]!, style: muted),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Text('Active projects', style: theme.textTheme.titleMedium),
        const SizedBox(height: 4),
        if (data.projects.isEmpty)
          const EmptyState(
            title: 'No projects yet',
            body: 'Tap ✨ above to describe a project and let Gemini plan it.',
          )
        else
          for (final p in data.projects)
            ProjectCard(
              project: p,
              onTap: () async {
                await Navigator.of(context)
                    .push(MaterialPageRoute(builder: (_) => ProjectDetailScreen(projectId: p.id)));
                provider.load();
              },
            ),
      ],
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value, required this.sub, this.danger = false});

  final String label;
  final String value;
  final String sub;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              label.toUpperCase(),
              style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.outline),
            ),
            const SizedBox(height: 2),
            Text(
              value,
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
                color: danger ? theme.colorScheme.error : null,
              ),
            ),
            Text(
              sub,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline),
            ),
          ],
        ),
      ),
    );
  }
}
