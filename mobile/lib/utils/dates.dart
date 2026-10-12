import 'package:intl/intl.dart';

/// Calendar helpers that work on `YYYY-MM-DD` keys, matching the API.
class DateKeys {
  static String fromDate(DateTime date) =>
      '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

  static String today() => fromDate(DateTime.now());

  static DateTime parse(String key) {
    final parts = key.split('-').map(int.parse).toList();
    return DateTime(parts[0], parts[1], parts[2]);
  }

  static String addDays(String key, int days) {
    final d = parse(key);
    return fromDate(DateTime(d.year, d.month, d.day + days));
  }

  static String label(String key, {String? today}) {
    final t = today ?? DateKeys.today();
    if (key == t) return 'Today';
    if (key == addDays(t, 1)) return 'Tomorrow';
    if (key == addDays(t, -1)) return 'Yesterday';
    return DateFormat('EEE, MMM d').format(parse(key));
  }

  static String short(String key) => DateFormat('MMM d').format(parse(key));

  static String weekdayLetter(String key) => DateFormat('E').format(parse(key)).substring(0, 1);
}

String formatMinutes(int total) {
  if (total < 60) return '${total}m';
  final h = total ~/ 60;
  final m = total % 60;
  return m == 0 ? '${h}h' : '${h}h ${m}m';
}
