import 'package:flutter/material.dart';

import '../models/task.dart';
import '../utils/dates.dart';
import 'common.dart';

class TaskTile extends StatelessWidget {
  const TaskTile({
    super.key,
    required this.task,
    required this.onStatus,
    this.onTap,
    this.today,
    this.showProject = true,
    this.trailing,
  });

  final Task task;
  final void Function(TaskStatus status) onStatus;
  final VoidCallback? onTap;
  final String? today;
  final bool showProject;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final muted = theme.textTheme.bodySmall?.copyWith(color: scheme.outline);
    final overdue = today != null && task.isOverdue(today!);

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Opacity(
          opacity: task.isDone ? 0.6 : 1,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(4, 6, 10, 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                IconButton(
                  tooltip: task.isDone ? 'Mark as not done' : 'Mark as done',
                  onPressed: () => onStatus(task.isDone ? TaskStatus.todo : TaskStatus.done),
                  icon: Icon(
                    task.isDone
                        ? Icons.check_circle
                        : task.status == TaskStatus.inProgress
                        ? Icons.timelapse
                        : Icons.radio_button_unchecked,
                    color: task.isDone
                        ? const Color(0xFF10B981)
                        : task.status == TaskStatus.inProgress
                        ? scheme.primary
                        : scheme.outline,
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 10),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text.rich(
                          TextSpan(
                            children: [
                              if (task.timeBlock != null)
                                TextSpan(
                                  text: '${task.timeBlock!.start}–${task.timeBlock!.end}  ',
                                  style: TextStyle(
                                    fontFeatures: const [FontFeature.tabularFigures()],
                                    color: scheme.primary,
                                    fontSize: 13,
                                  ),
                                ),
                              TextSpan(
                                text: task.title,
                                style: TextStyle(
                                  fontWeight: FontWeight.w500,
                                  decoration: task.isDone ? TextDecoration.lineThrough : null,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 6),
                        Wrap(
                          spacing: 8,
                          runSpacing: 4,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            EnergyChip(energy: task.energy),
                            PriorityLabel(priority: task.priority),
                            if (task.estimateMinutes > 0)
                              Text(formatMinutes(task.estimateMinutes), style: muted),
                            if (task.rolloverCount > 0)
                              Text(
                                '↻ ${task.rolloverCount}×',
                                style: muted?.copyWith(color: const Color(0xFFD97706)),
                              ),
                            if (task.dueDate != null)
                              Text(
                                'due ${DateKeys.short(task.dueDate!)}',
                                style: overdue
                                    ? muted?.copyWith(
                                        color: scheme.error,
                                        fontWeight: FontWeight.w600,
                                      )
                                    : muted,
                              ),
                            if (showProject &&
                                task.project != null &&
                                task.project!.title.isNotEmpty)
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    width: 8,
                                    height: 8,
                                    decoration: BoxDecoration(
                                      color: colorFromHex(task.project!.color),
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  Text(task.project!.title, style: muted),
                                ],
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                ?trailing,
              ],
            ),
          ),
        ),
      ),
    );
  }
}
