import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/plan.dart';
import '../models/task.dart';
import '../services/api_client.dart';
import '../utils/dates.dart';
import '../widgets/common.dart';

const _colors = [
  '#6366f1',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#8b5cf6',
  '#14b8a6',
];
const _examples = [
  'Build a SaaS landing page with Stripe checkout and a waitlist',
  'Migrate my Express API to TypeScript with tests',
  'Ship a Flutter habit tracker to the App Store',
];

/// Describe a project, let Gemini draft milestones and tasks, edit, then save.
/// Pops with `true` once a project was created.
class NewProjectScreen extends StatefulWidget {
  const NewProjectScreen({super.key});

  @override
  State<NewProjectScreen> createState() => _NewProjectScreenState();
}

class _NewProjectScreenState extends State<NewProjectScreen> {
  final _prompt = TextEditingController();
  String? _deadline;
  String _color = _colors.first;
  Plan? _plan;
  bool _generating = false;
  bool _saving = false;
  String? _error;

  ApiClient get _api => context.read<ApiClient>();

  @override
  void dispose() {
    _prompt.dispose();
    super.dispose();
  }

  Future<void> _generate() async {
    FocusScope.of(context).unfocus();
    if (_prompt.text.trim().length < 10) {
      setState(() => _error = 'Describe the project in at least a sentence.');
      return;
    }
    setState(() {
      _generating = true;
      _error = null;
    });
    try {
      final plan = await _api.generatePlan(_prompt.text.trim(), deadline: _deadline);
      if (mounted) setState(() => _plan = plan);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _generating = false);
    }
  }

  Future<void> _save() async {
    final plan = _plan;
    if (plan == null) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await _api.createFromPlan(
        plan,
        prompt: _prompt.text.trim(),
        deadline: _deadline,
        color: _color,
      );
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _pickDeadline() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _deadline != null
          ? DateKeys.parse(_deadline!)
          : now.add(const Duration(days: 30)),
      firstDate: now.add(const Duration(days: 1)),
      lastDate: DateTime(now.year + 3),
    );
    if (picked != null) setState(() => _deadline = DateKeys.fromDate(picked));
  }

  Future<String?> _editText(String title, String initial) async {
    final controller = TextEditingController(text: initial);
    final value = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLines: null,
          textCapitalization: TextCapitalization.sentences,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, controller.text.trim()),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    controller.dispose();
    return value == null || value.isEmpty ? null : value;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final muted = theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline);
    final plan = _plan;

    return Scaffold(
      appBar: AppBar(title: const Text('New project')),
      bottomNavigationBar: plan == null
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                child: FilledButton(
                  style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                  onPressed: _saving ? null : _save,
                  child: _saving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text('Create project · ${plan.taskCount} tasks'),
                ),
              ),
            ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            controller: _prompt,
            minLines: 3,
            maxLines: 6,
            maxLength: 4000,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(
              labelText: 'What do you want to build?',
              hintText:
                  'A personal finance dashboard that imports bank CSVs and shows monthly trends…',
              alignLabelWithHint: true,
            ),
          ),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final ex in _examples)
                ActionChip(
                  label: Text(ex, style: const TextStyle(fontSize: 12)),
                  onPressed: () => _prompt.text = ex,
                ),
            ],
          ),
          const SizedBox(height: 12),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.flag_outlined),
            title: Text(
              _deadline == null ? 'No deadline' : 'Deadline ${DateKeys.short(_deadline!)}',
            ),
            trailing: _deadline == null
                ? null
                : IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => setState(() => _deadline = null),
                  ),
            onTap: _pickDeadline,
          ),
          Row(
            children: [
              for (final c in _colors)
                GestureDetector(
                  onTap: () => setState(() => _color = c),
                  child: Container(
                    margin: const EdgeInsets.only(right: 8),
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      color: colorFromHex(c),
                      shape: BoxShape.circle,
                      border: _color == c
                          ? Border.all(color: theme.colorScheme.onSurface, width: 2)
                          : null,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: _generating ? null : _generate,
            icon: _generating
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.auto_awesome),
            label: Text(
              _generating
                  ? 'Gemini is planning…'
                  : plan == null
                  ? 'Generate plan'
                  : 'Regenerate plan',
            ),
          ),
          if (_error != null) ...[const SizedBox(height: 12), ErrorBanner(message: _error!)],
          if (plan != null) ...[
            const SizedBox(height: 20),
            InkWell(
              onTap: () async {
                final v = await _editText('Project title', plan.title);
                if (v != null) setState(() => plan.title = v);
              },
              child: Text(plan.title, style: theme.textTheme.headlineSmall),
            ),
            if (plan.description.isNotEmpty) Text(plan.description, style: muted),
            const SizedBox(height: 4),
            Text(
              '${plan.milestones.length} milestones · ${plan.taskCount} tasks · ~${formatMinutes(plan.totalMinutes)}',
              style: muted,
            ),
            for (final (mi, m) in plan.milestones.indexed)
              Card(
                margin: const EdgeInsets.only(top: 12),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 8, 4, 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 12,
                            child: Text('${mi + 1}', style: const TextStyle(fontSize: 12)),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: InkWell(
                              onTap: () async {
                                final v = await _editText('Milestone', m.title);
                                if (v != null) setState(() => m.title = v);
                              },
                              child: Text(m.title, style: theme.textTheme.titleSmall),
                            ),
                          ),
                          Text('${m.durationDays}d', style: muted),
                          if (plan.milestones.length > 1)
                            IconButton(
                              tooltip: 'Remove milestone',
                              icon: const Icon(Icons.close, size: 18),
                              onPressed: () => setState(() => plan.milestones.removeAt(mi)),
                            ),
                        ],
                      ),
                      for (final (ti, t) in m.tasks.indexed)
                        ListTile(
                          dense: true,
                          contentPadding: const EdgeInsets.only(left: 34),
                          title: Text(t.title),
                          subtitle: Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Row(
                              children: [
                                EnergyChip(energy: t.energy),
                                const SizedBox(width: 8),
                                PriorityLabel(priority: t.priority),
                                const SizedBox(width: 8),
                                Text(formatMinutes(t.estimateMinutes), style: muted),
                              ],
                            ),
                          ),
                          onTap: () async {
                            final v = await _editText('Task', t.title);
                            if (v != null) setState(() => t.title = v);
                          },
                          trailing: PopupMenuButton<String>(
                            onSelected: (v) => setState(() {
                              if (v == 'remove') {
                                m.tasks.removeAt(ti);
                              } else {
                                t.energy = levelFromApi(v);
                              }
                            }),
                            itemBuilder: (_) => [
                              for (final l in Level.values)
                                PopupMenuItem(value: l.name, child: Text('${l.name} energy')),
                              if (m.tasks.length > 1)
                                const PopupMenuItem(value: 'remove', child: Text('Remove task')),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }
}
