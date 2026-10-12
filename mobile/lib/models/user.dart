class User {
  final String id;
  final String name;
  final String email;
  final String dayStart;
  final String dayEnd;

  const User({
    required this.id,
    required this.name,
    required this.email,
    required this.dayStart,
    required this.dayEnd,
  });

  factory User.fromJson(Map<String, dynamic> json) => User(
    id: json['id'] as String,
    name: json['name'] as String? ?? '',
    email: json['email'] as String? ?? '',
    dayStart: json['dayStart'] as String? ?? '09:00',
    dayEnd: json['dayEnd'] as String? ?? '18:00',
  );

  String get firstName => name.split(' ').first;
}
