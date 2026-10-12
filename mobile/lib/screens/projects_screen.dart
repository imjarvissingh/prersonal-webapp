import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../state/projects_provider.dart';
import '../widgets/common.dart';
import '../widgets/project_card.dart';
import 'new_project_screen.dart';
import 'project_detail_screen.dart';

class ProjectsScreen extends StatelessWidget {
  const ProjectsScreen({super.key});

  static const _filters = <(String?, String)>[
    (null, 'Current'),
    ('completed', 'Completed'),
    ('archived', 'Archived'),
    ('all', 'All'),
  ];

  @override
  Widget build(BuildContext context) {
    final p = context.watch<ProjectsProvider>();
    return Scaffold(
      appBar: AppBar(title: const Text('Projects')),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: null,
        icon: const Icon(Icons.auto_awesome),
        label: const Text('New project'),
        onPressed: () async {
          final created = await Navigator.of(context)
              .push<bool>(MaterialPageRoute(builder: (_) => const NewProjectScreen()));
          if (created == true) p.load();
        },
      ),
      body: RefreshIndicator(
        onRefresh: p.load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 96),
          children: [
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final (value, label) in _filters)
                    Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: ChoiceChip(
                        label: Text(label),
                        selected: p.statusFilter == value,
                        onSelected: (_) => p.setStatusFilter(value),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            if (p.error != null) ErrorBanner(message: p.error!, onRetry: p.load),
            if (p.loading && p.projects.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 80),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (p.projects.isEmpty)
              const EmptyState(
                title: 'No projects here',
                body: 'Describe what you want to build and Gemini will plan it.',
              )
            else
              for (final project in p.projects)
                ProjectCard(
                  project: project,
                  onTap: () async {
                    await Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => ProjectDetailScreen(projectId: project.id)),
                    );
                    p.load();
                  },
                ),
          ],
        ),
      ),
    );
  }
}
