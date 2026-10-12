import 'package:flutter/material.dart';

import '../models/project.dart';
import '../utils/dates.dart';
import 'common.dart';

class ProjectCard extends StatelessWidget {
  const ProjectCard({super.key, required this.project, required this.onTap});

  final Project project;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final muted = theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline);
    final s = project.stats;
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 6),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: colorFromHex(project.color),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      project.title,
                      style: theme.textTheme.titleMedium,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  HealthBadge(health: s.health),
                ],
              ),
              if (project.description.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(
                  project.description,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: muted,
                ),
              ],
              const SizedBox(height: 12),
              Row(
                children: [
                  Text('${s.done}/${s.total} tasks', style: muted),
                  const Spacer(),
                  Text('${s.progress}%', style: theme.textTheme.labelLarge),
                ],
              ),
              const SizedBox(height: 6),
              ProgressTrack(
                value: s.progress,
                color: healthColors[s.health],
                expected: s.expectedProgress,
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 12,
                children: [
                  if (project.dueDate != null)
                    Text('Due ${DateKeys.short(project.dueDate!)}', style: muted),
                  if (s.overdue > 0)
                    Text(
                      '${s.overdue} overdue',
                      style: muted?.copyWith(color: theme.colorScheme.error),
                    ),
                  if (project.aiGenerated) Text('✨ AI plan', style: muted),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
