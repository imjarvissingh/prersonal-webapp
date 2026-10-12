import 'package:flutter/material.dart';

import '../models/project.dart';
import '../models/task.dart';
import '../utils/dates.dart';

class TaskEditorResult {
  final TaskInput? input;
  final bool delete;
  const TaskEditorResult.save(this.input) : delete = false;
  const TaskEditorResult.delete() : input = null, delete = true;
}

/// Opens the create/edit task sheet. Resolves to null when dismissed.
Future<TaskEditorResult?> showTaskEditor(
  BuildContext context, {
  Task? task,
  String? defaultDate,
  String? projectId,
  String? defaultMilestone,
  List<Milestone> milestones = const [],
}) {
  return showModalBottomSheet<TaskEditorResult>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    builder: (_) => TaskEditorSheet(
      task: task,
      defaultDate: defaultDate,
      projectId: projectId,
      defaultMilestone: defaultMilestone,
      milestones: milestones,
    ),
  );
}

class TaskEditorSheet extends StatefulWidget {
  const TaskEditorSheet({
    super.key,
    this.task,
    this.defaultDate,
    this.projectId,
    this.defaultMilestone,
    this.milestones = const [],
  });

  final Task? task;
  final String? defaultDate;
  final String? projectId;
  final String? defaultMilestone;
  final List<Milestone> milestones;

  @override
  State<TaskEditorSheet> createState() => _TaskEditorSheetState();
}

class _TaskEditorSheetState extends State<TaskEditorSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _title;
  late final TextEditingController _notes;
  late Level _energy;
  late Level _priority;
  late TaskStatus _status;
  late int _estimate;
  String? _date;
  TimeOfDay? _start;
  TimeOfDay? _end;
  String? _due;
  String? _milestone;
  String? _error;

  final List<int> _estimates = [0, 15, 30, 45, 60, 90, 120, 180, 240];

  @override
  void initState() {
    super.initState();
    final t = widget.task;
    _title = TextEditingController(text: t?.title ?? '');
    _notes = TextEditingController(text: t?.notes ?? '');
    _energy = t?.energy ?? Level.medium;
    _priority = t?.priority ?? Level.medium;
    _status = t?.status ?? TaskStatus.todo;
    _estimate = t?.estimateMinutes ?? 30;
    if (!_estimates.contains(_estimate)) {
      _estimates
        ..add(_estimate)
        ..sort();
    }
    _date = t?.scheduledDate ?? (t == null ? widget.defaultDate : null);
    _start = _parseTime(t?.timeBlock?.start);
    _end = _parseTime(t?.timeBlock?.end);
    _due = t?.dueDate;
    _milestone = t?.milestone ?? widget.defaultMilestone;
  }

  @override
  void dispose() {
    _title.dispose();
    _notes.dispose();
    super.dispose();
  }

  static TimeOfDay? _parseTime(String? hhmm) {
    if (hhmm == null) return null;
    final parts = hhmm.split(':').map(int.parse).toList();
    return TimeOfDay(hour: parts[0], minute: parts[1]);
  }

  static String _fmt(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  Future<String?> _pickDate(String? initial) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initial != null ? DateKeys.parse(initial) : now,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 3),
    );
    return picked == null ? null : DateKeys.fromDate(picked);
  }

  Future<TimeOfDay?> _pickTime(TimeOfDay? initial) =>
      showTimePicker(context: context, initialTime: initial ?? const TimeOfDay(hour: 9, minute: 0));

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    if ((_start == null) != (_end == null)) {
      setState(() => _error = 'Set both a start and end time, or neither');
      return;
    }
    if (_start != null && _fmt(_start!).compareTo(_fmt(_end!)) >= 0) {
      setState(() => _error = 'End time must be after start time');
      return;
    }
    final hasBlock = _start != null && _end != null && _date != null;
    final clear = <String>{
      if (_date == null) 'scheduledDate',
      if (!hasBlock) 'timeBlock',
      if (_due == null) 'dueDate',
      if (widget.milestones.isNotEmpty && _milestone == null) 'milestone',
    };
    Navigator.of(context).pop(
      TaskEditorResult.save(
        TaskInput(
          title: _title.text.trim(),
          notes: _notes.text.trim(),
          status: _status,
          priority: _priority,
          energy: _energy,
          estimateMinutes: _estimate,
          scheduledDate: _date,
          timeBlock: hasBlock ? TimeBlock(start: _fmt(_start!), end: _fmt(_end!)) : null,
          dueDate: _due,
          project: widget.task == null ? widget.projectId : null,
          milestone: _milestone,
          clear: clear,
        ),
      ),
    );
  }

  Widget _levelPicker(String label, Level value, ValueChanged<Level> onChanged) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: Theme.of(context).textTheme.labelMedium),
        const SizedBox(height: 6),
        SegmentedButton<Level>(
          showSelectedIcon: false,
          segments: const [
            ButtonSegment(value: Level.low, label: Text('Low')),
            ButtonSegment(value: Level.medium, label: Text('Med')),
            ButtonSegment(value: Level.high, label: Text('High')),
          ],
          selected: {value},
          onSelectionChanged: (s) => onChanged(s.first),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, bottom + 20),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                widget.task == null ? 'New task' : 'Edit task',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _title,
                autofocus: widget.task == null,
                maxLength: 200,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(labelText: 'Title', counterText: ''),
                validator: (v) => v == null || v.trim().isEmpty ? 'Title is required' : null,
              ),
              const SizedBox(height: 16),
              _levelPicker('Energy', _energy, (v) => setState(() => _energy = v)),
              const SizedBox(height: 12),
              _levelPicker('Priority', _priority, (v) => setState(() => _priority = v)),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<int>(
                      isExpanded: true,
                      initialValue: _estimate,
                      decoration: const InputDecoration(labelText: 'Estimate'),
                      items: [
                        for (final m in _estimates)
                          DropdownMenuItem(
                            value: m,
                            child: Text(m == 0 ? 'None' : formatMinutes(m)),
                          ),
                      ],
                      onChanged: (v) => setState(() => _estimate = v ?? 30),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: DropdownButtonFormField<TaskStatus>(
                      isExpanded: true,
                      initialValue: _status,
                      decoration: const InputDecoration(labelText: 'Status'),
                      items: const [
                        DropdownMenuItem(value: TaskStatus.todo, child: Text('To do')),
                        DropdownMenuItem(value: TaskStatus.inProgress, child: Text('In progress')),
                        DropdownMenuItem(value: TaskStatus.done, child: Text('Done')),
                      ],
                      onChanged: (v) => setState(() => _status = v ?? TaskStatus.todo),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.event),
                title: Text(_date == null ? 'Backlog (no day)' : DateKeys.label(_date!)),
                subtitle: const Text('Planned day'),
                trailing: _date == null
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => setState(() {
                          _date = null;
                          _start = null;
                          _end = null;
                        }),
                      ),
                onTap: () async {
                  final d = await _pickDate(_date);
                  if (d != null) setState(() => _date = d);
                },
              ),
              if (_date != null)
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.schedule, size: 18),
                        label: Text(_start == null ? 'Start' : _fmt(_start!)),
                        onPressed: () async {
                          final t = await _pickTime(_start);
                          if (t != null) setState(() => _start = t);
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.schedule, size: 18),
                        label: Text(_end == null ? 'End' : _fmt(_end!)),
                        onPressed: () async {
                          final t = await _pickTime(_end ?? _start);
                          if (t != null) setState(() => _end = t);
                        },
                      ),
                    ),
                    if (_start != null || _end != null)
                      IconButton(
                        tooltip: 'Clear time block',
                        icon: const Icon(Icons.close),
                        onPressed: () => setState(() {
                          _start = null;
                          _end = null;
                        }),
                      ),
                  ],
                ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.flag_outlined),
                title: Text(_due == null ? 'No due date' : 'Due ${DateKeys.short(_due!)}'),
                trailing: _due == null
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => setState(() => _due = null),
                      ),
                onTap: () async {
                  final d = await _pickDate(_due);
                  if (d != null) setState(() => _due = d);
                },
              ),
              if (widget.milestones.isNotEmpty)
                DropdownButtonFormField<String?>(
                  isExpanded: true,
                  initialValue: widget.milestones.any((m) => m.id == _milestone)
                      ? _milestone
                      : null,
                  decoration: const InputDecoration(labelText: 'Milestone'),
                  items: [
                    const DropdownMenuItem<String?>(value: null, child: Text('None')),
                    for (final m in widget.milestones)
                      DropdownMenuItem<String?>(
                        value: m.id,
                        child: Text(m.title, overflow: TextOverflow.ellipsis),
                      ),
                  ],
                  onChanged: (v) => setState(() => _milestone = v),
                ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _notes,
                maxLines: 3,
                maxLength: 4000,
                decoration: const InputDecoration(labelText: 'Notes', counterText: ''),
              ),
              if (_error != null) ...[
                const SizedBox(height: 8),
                Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
              ],
              const SizedBox(height: 16),
              Row(
                children: [
                  if (widget.task != null)
                    TextButton(
                      style: TextButton.styleFrom(
                        foregroundColor: Theme.of(context).colorScheme.error,
                      ),
                      onPressed: () async {
                        final navigator = Navigator.of(context);
                        final ok = await showDialog<bool>(
                          context: context,
                          builder: (ctx) => AlertDialog(
                            title: const Text('Delete task?'),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(ctx, false),
                                child: const Text('Cancel'),
                              ),
                              TextButton(
                                onPressed: () => Navigator.pop(ctx, true),
                                child: const Text('Delete'),
                              ),
                            ],
                          ),
                        );
                        if (ok == true) navigator.pop(const TaskEditorResult.delete());
                      },
                      child: const Text('Delete'),
                    ),
                  const Spacer(),
                  TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: _submit,
                    child: Text(widget.task == null ? 'Add task' : 'Save'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
