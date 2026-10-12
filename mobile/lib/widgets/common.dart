import 'package:flutter/material.dart';

import '../models/project.dart';
import '../models/task.dart';

Color colorFromHex(String hex) {
  final value = int.tryParse(hex.replaceFirst('#', ''), radix: 16) ?? 0x6366f1;
  return Color(0xFF000000 | value);
}

const healthColors = {
  Health.green: Color(0xFF10B981),
  Health.yellow: Color(0xFFF59E0B),
  Health.red: Color(0xFFEF4444),
};

const healthLabels = {Health.green: 'On track', Health.yellow: 'At risk', Health.red: 'Off track'};

class HealthBadge extends StatelessWidget {
  const HealthBadge({super.key, required this.health});

  final Health health;

  @override
  Widget build(BuildContext context) {
    final color = healthColors[health]!;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 5),
          Text(
            healthLabels[health]!,
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color),
          ),
        ],
      ),
    );
  }
}

/// Progress bar with an optional "expected by now" marker.
class ProgressTrack extends StatelessWidget {
  const ProgressTrack({super.key, required this.value, this.color, this.expected, this.height = 8});

  final int value;
  final Color? color;
  final int? expected;
  final double height;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final fraction = (value.clamp(0, 100)) / 100;
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        return SizedBox(
          height: height,
          child: Stack(
            children: [
              Container(
                decoration: BoxDecoration(
                  color: scheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(height),
                ),
              ),
              AnimatedContainer(
                duration: const Duration(milliseconds: 400),
                width: width * fraction,
                decoration: BoxDecoration(
                  color: color ?? scheme.primary,
                  borderRadius: BorderRadius.circular(height),
                ),
              ),
              if (expected != null && expected! > 0 && expected! < 100)
                Positioned(
                  left: width * expected! / 100 - 1,
                  top: 0,
                  bottom: 0,
                  child: Container(width: 2, color: scheme.onSurface.withValues(alpha: 0.45)),
                ),
            ],
          ),
        );
      },
    );
  }
}

const energyColors = {
  Level.high: Color(0xFFE11D48),
  Level.medium: Color(0xFF0284C7),
  Level.low: Color(0xFF64748B),
};

class EnergyChip extends StatelessWidget {
  const EnergyChip({super.key, required this.energy});

  final Level energy;

  @override
  Widget build(BuildContext context) {
    final color = energyColors[energy]!;
    final bolts = switch (energy) {
      Level.high => 3,
      Level.medium => 2,
      Level.low => 1,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        '${'⚡' * bolts} ${energy.name}',
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: color),
      ),
    );
  }
}

class PriorityLabel extends StatelessWidget {
  const PriorityLabel({super.key, required this.priority});

  final Level priority;

  @override
  Widget build(BuildContext context) {
    final color = switch (priority) {
      Level.high => const Color(0xFFDC2626),
      Level.medium => const Color(0xFFD97706),
      Level.low => Theme.of(context).colorScheme.outline,
    };
    return Text(
      priority.name.toUpperCase(),
      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: color),
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.title, this.body, this.action});

  final String title;
  final String? body;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
      decoration: BoxDecoration(
        border: Border.all(color: theme.colorScheme.outlineVariant),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Text(title, style: theme.textTheme.titleSmall, textAlign: TextAlign.center),
          if (body != null) ...[
            const SizedBox(height: 6),
            Text(
              body!,
              style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline),
              textAlign: TextAlign.center,
            ),
          ],
          if (action != null) ...[const SizedBox(height: 12), action!],
        ],
      ),
    );
  }
}

class ErrorBanner extends StatelessWidget {
  const ErrorBanner({super.key, required this.message, this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(14, 10, 6, 10),
      decoration: BoxDecoration(
        color: scheme.errorContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(message, style: TextStyle(color: scheme.onErrorContainer)),
          ),
          if (onRetry != null) TextButton(onPressed: onRetry, child: const Text('Retry')),
        ],
      ),
    );
  }
}

void showSnack(BuildContext context, String message) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message), behavior: SnackBarBehavior.floating));
}
