import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/task.dart';
import '../services/api_client.dart';
import '../state/today_provider.dart';
import '../utils/dates.dart';
import '../widgets/common.dart';
import '../widgets/task_editor_sheet.dart';
import '../widgets/task_tile.dart';

class TodayScreen extends StatefulWidget {
  const TodayScreen({super.key});

  @override
  State<TodayScreen> createState() => _TodayScreenState();
}

class _TodayScreenState extends State<TodayScreen> {
  final _quickAdd = TextEditingController();
  bool _scheduling = false;

  @override
  void dispose() {
    _quickAdd.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action) async {
    try {
      await action();
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message);
    }
  }

  Future<void> _edit(TodayProvider p, Task? task) async {
    final result = await showTaskEditor(context, task: task, defaultDate: p.date);
    if (result == null) return;
    await _run(() async {
      if (result.delete && task != null) {
        await p.delete(task);
      } else if (result.input != null) {
        await p.save(task, result.input!);
      }
    });
  }

  Future<void> _autoSchedule(TodayProvider p) async {
    setState(() => _scheduling = true);
    try {
      final r = await p.autoSchedule();
      if (!mounted) return;
      showSnack(
        context,
        r.placed == 0 && r.unplaced == 0
            ? 'Everything already has a time block.'
            : 'Blocked out ${r.placed} task${r.placed == 1 ? '' : 's'}'
                  '${r.unplaced > 0 ? ', ${r.unplaced} didn\'t fit your working hours' : ''}.',
      );
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message);
    } finally {
      if (mounted) setState(() => _scheduling = false);
    }
  }

  Future<void> _showBacklog(TodayProvider p) async {
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (ctx) => ChangeNotifierProvider.value(
        value: p,
        child: Consumer<TodayProvider>(
          builder: (ctx, p, _) => DraggableScrollableSheet(
            expand: false,
            initialChildSize: 0.6,
            maxChildSize: 0.95,
            builder: (ctx, controller) => ListView(
              controller: controller,
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
              children: [
                Text('Backlog', style: Theme.of(ctx).textTheme.titleLarge),
                const SizedBox(height: 4),
                Text(
                  'Tap + to plan a task for ${DateKeys.label(p.date, today: p.today).toLowerCase()}.',
                  style: Theme.of(ctx).textTheme.bodySmall,
                ),
                const SizedBox(height: 12),
                if (p.backlog.isEmpty)
                  const EmptyState(
                    title: 'Backlog is empty',
                    body: 'Tasks from AI-generated projects land here.',
                  ),
                for (final task in p.backlog)
                  Card(
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    child: ListTile(
                      title: Text(task.title),
                      subtitle: Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Row(
                          children: [
                            EnergyChip(energy: task.energy),
                            const SizedBox(width: 8),
                            if (task.project != null)
                              Flexible(
                                child: Text(task.project!.title, overflow: TextOverflow.ellipsis),
                              ),
                          ],
                        ),
                      ),
                      trailing: IconButton.filledTonal(
                        icon: const Icon(Icons.add),
                        onPressed: () => _run(() => p.pullIntoDay(task)),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = context.watch<TodayProvider>();
    final theme = Theme.of(context);
    final isPast = p.date.compareTo(p.today) < 0;
    final blocked = p.timeBlocked;
    final anytime = p.anytime;

    return Scaffold(
      appBar: AppBar(
        title: GestureDetector(
          onTap: () async {
            final picked = await showDatePicker(
              context: context,
              initialDate: DateKeys.parse(p.date),
              firstDate: DateTime.now().subtract(const Duration(days: 365)),
              lastDate: DateTime.now().add(const Duration(days: 365 * 2)),
            );
            if (picked != null) p.setDate(DateKeys.fromDate(picked));
          },
          child: Text(DateKeys.label(p.date, today: p.today)),
        ),
        actions: [
          IconButton(
            tooltip: 'Previous day',
            icon: const Icon(Icons.chevron_left),
            onPressed: () => p.setDate(DateKeys.addDays(p.date, -1)),
          ),
          if (p.date != p.today)
            TextButton(onPressed: () => p.setDate(p.today), child: const Text('Today')),
          IconButton(
            tooltip: 'Next day',
            icon: const Icon(Icons.chevron_right),
            onPressed: () => p.setDate(DateKeys.addDays(p.date, 1)),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: null,
        tooltip: 'New task',
        onPressed: () => _edit(p, null),
        child: const Icon(Icons.add),
      ),
      body: RefreshIndicator(
        onRefresh: p.load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 96),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${p.doneCount}/${p.tasks.length} done · ${formatMinutes(p.plannedMinutes)} planned',
                          ),
                        ),
                        if (p.loading)
                          const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    ProgressTrack(value: p.tasks.isEmpty ? 0 : p.doneCount * 100 ~/ p.tasks.length),
                    const SizedBox(height: 12),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          for (final level in <Level?>[null, Level.high, Level.medium, Level.low])
                            Padding(
                              padding: const EdgeInsets.only(right: 6),
                              child: ChoiceChip(
                                label: Text(level == null ? 'All energy' : '⚡ ${level.name}'),
                                selected: p.energyFilter == level,
                                onSelected: (_) => p.setEnergyFilter(level),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: isPast || _scheduling ? null : () => _autoSchedule(p),
                    icon: _scheduling
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.schedule),
                    label: const Text('Auto time-block'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _showBacklog(p),
                    icon: const Icon(Icons.inbox_outlined),
                    label: Text('Backlog (${p.backlog.length})'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _quickAdd,
              textCapitalization: TextCapitalization.sentences,
              textInputAction: TextInputAction.done,
              decoration: InputDecoration(
                hintText: 'Quick add to ${DateKeys.label(p.date, today: p.today).toLowerCase()}…',
                prefixIcon: const Icon(Icons.add_task),
              ),
              onSubmitted: (value) {
                final title = value.trim();
                if (title.isEmpty) return;
                _quickAdd.clear();
                _run(() => p.quickAdd(title));
              },
            ),
            if (p.error != null) ...[
              const SizedBox(height: 12),
              ErrorBanner(message: p.error!, onRetry: p.load),
            ],
            const SizedBox(height: 16),
            Text(
              'TIME BLOCKS',
              style: theme.textTheme.labelMedium?.copyWith(color: theme.colorScheme.outline),
            ),
            const SizedBox(height: 4),
            if (blocked.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text(
                  'No time blocks yet. Auto time-block slots open tasks into your working hours, high-energy work first.',
                  style: theme.textTheme.bodySmall,
                ),
              ),
            for (final task in blocked)
              TaskTile(
                task: task,
                today: p.today,
                onStatus: (s) => p.setStatus(task, s),
                onTap: () => _edit(p, task),
              ),
            const SizedBox(height: 16),
            Text(
              'ANYTIME',
              style: theme.textTheme.labelMedium?.copyWith(color: theme.colorScheme.outline),
            ),
            const SizedBox(height: 4),
            if (anytime.isEmpty && blocked.isEmpty && !p.loading)
              const EmptyState(
                title: 'Nothing planned',
                body: 'Add a task or pull one in from your backlog.',
              ),
            for (final task in anytime)
              Dismissible(
                key: ValueKey(task.id),
                direction: task.isDone ? DismissDirection.none : DismissDirection.endToStart,
                background: Container(
                  alignment: Alignment.centerRight,
                  padding: const EdgeInsets.only(right: 20),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [Icon(Icons.inbox_outlined), SizedBox(width: 6), Text('Backlog')],
                  ),
                ),
                onDismissed: (_) => _run(() => p.sendToBacklog(task)),
                child: TaskTile(
                  task: task,
                  today: p.today,
                  onStatus: (s) => p.setStatus(task, s),
                  onTap: () => _edit(p, task),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
