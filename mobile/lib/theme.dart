import 'package:flutter/material.dart';

const brandIndigo = Color(0xFF4F46E5);

ThemeData buildTheme(Brightness brightness) {
  final scheme = ColorScheme.fromSeed(seedColor: brandIndigo, brightness: brightness);
  final isDark = brightness == Brightness.dark;
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: isDark ? const Color(0xFF0B1020) : const Color(0xFFF8FAFC),
    appBarTheme: AppBarTheme(
      centerTitle: false,
      backgroundColor: isDark ? const Color(0xFF0B1020) : const Color(0xFFF8FAFC),
      surfaceTintColor: Colors.transparent,
      titleTextStyle: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: scheme.onSurface),
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      color: isDark ? const Color(0xFF131A2E) : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: scheme.outlineVariant.withValues(alpha: 0.6)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
      isDense: true,
    ),
  );
}
