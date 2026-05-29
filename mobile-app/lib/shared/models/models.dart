// ─── Employee ────────────────────────────────────────────────────────────────
class EmployeeModel {
  final int id;
  final String employeeId;
  final String name;
  final String phone;
  final String jobType; // field_officer | calling_team
  final String designation;
  final double basicSalary;
  final bool isOnDuty;
  final int totalPoints;
  final int currentMonthPoints;
  final List<ZoneModel> zones;

  const EmployeeModel({
    required this.id, required this.employeeId, required this.name,
    required this.phone, required this.jobType, required this.designation,
    required this.basicSalary, required this.isOnDuty,
    required this.totalPoints, required this.currentMonthPoints,
    required this.zones,
  });

  factory EmployeeModel.fromJson(Map<String, dynamic> j) => EmployeeModel(
    id: j['id'] ?? 0,
    employeeId: j['employeeId'] ?? '',
    name: j['name'] ?? '',
    phone: j['phone'] ?? '',
    jobType: j['jobType'] ?? 'field_officer',
    designation: j['designation'] ?? '',
    basicSalary: (j['basicSalary'] ?? 0).toDouble(),
    isOnDuty: j['isOnDuty'] ?? false,
    totalPoints: j['totalPoints'] ?? 0,
    currentMonthPoints: j['currentMonthPoints'] ?? 0,
    zones: (j['zones'] as List? ?? []).map((z) => ZoneModel.fromJson(z)).toList(),
  );

  bool get isFieldOfficer => jobType == 'field_officer';
  bool get isCallingTeam  => jobType == 'calling_team';

  EmployeeModel copyWith({ bool? isOnDuty }) => EmployeeModel(
    id: id, employeeId: employeeId, name: name, phone: phone,
    jobType: jobType, designation: designation, basicSalary: basicSalary,
    totalPoints: totalPoints, currentMonthPoints: currentMonthPoints, zones: zones,
    isOnDuty: isOnDuty ?? this.isOnDuty,
  );
}

// ─── Zone ─────────────────────────────────────────────────────────────────────
class ZoneModel {
  final int id;
  final String name;
  final String city;

  const ZoneModel({ required this.id, required this.name, required this.city });

  factory ZoneModel.fromJson(Map<String, dynamic> j) => ZoneModel(
    id: j['id'] ?? 0,
    name: j['name'] ?? '',
    city: j['city'] ?? 'Indore',
  );
}

// ─── AppConfig ────────────────────────────────────────────────────────────────
class AppConfigModel {
  final Map<String, dynamic> officeTimings;
  final Map<String, dynamic> attendanceRules;
  final Map<String, dynamic> features;
  final Map<String, dynamic> appVersioning;
  final Map<String, dynamic> maintenance;
  final Map<String, dynamic> pointsConfig;

  const AppConfigModel({
    required this.officeTimings, required this.attendanceRules,
    required this.features, required this.appVersioning,
    required this.maintenance, required this.pointsConfig,
  });

  factory AppConfigModel.fromJson(Map<String, dynamic> j) => AppConfigModel(
    officeTimings:  Map<String, dynamic>.from(j['officeTimings']  ?? {}),
    attendanceRules:Map<String, dynamic>.from(j['attendanceRules']?? {}),
    features:       Map<String, dynamic>.from(j['features']       ?? {}),
    appVersioning:  Map<String, dynamic>.from(j['appVersioning']  ?? {}),
    maintenance:    Map<String, dynamic>.from(j['maintenance']    ?? {}),
    pointsConfig:   Map<String, dynamic>.from(j['pointsConfig']   ?? {}),
  );

  String get officeStart     => officeTimings['startTime']     ?? '09:00';
  String get officeEnd       => officeTimings['endTime']       ?? '18:00';
  int    get graceMinutes    => officeTimings['graceMinutes']  ?? 15;
  int    get locationInterval=> attendanceRules['locationIntervalSeconds'] ?? 60;
  bool   isFeatureOn(String f)=> features[f] == true;
  bool   get isMaintenanceMode => maintenance['isEnabled'] == true;
  String get maintenanceMsg    => maintenance['message'] ?? 'Under maintenance';
  bool   get forceUpdate       => appVersioning['forceUpdate'] == true;
  String get minVersion        => appVersioning['minSupportedVersion'] ?? '1.0.0';
}

// ─── Attendance ───────────────────────────────────────────────────────────────
class AttendanceModel {
  final int id;
  final String date;
  final String status;
  final DateTime? checkInTime;
  final DateTime? checkOutTime;
  final double workingHours;
  final bool isLate;
  final int lateMinutes;

  const AttendanceModel({
    required this.id, required this.date, required this.status,
    this.checkInTime, this.checkOutTime, required this.workingHours,
    required this.isLate, required this.lateMinutes,
  });

  factory AttendanceModel.fromJson(Map<String, dynamic> j) => AttendanceModel(
    id: j['id'] ?? 0,
    date: j['date'] ?? '',
    status: j['status'] ?? 'absent',
    checkInTime:  j['checkInTime']  != null ? DateTime.tryParse(j['checkInTime'])  : null,
    checkOutTime: j['checkOutTime'] != null ? DateTime.tryParse(j['checkOutTime']) : null,
    workingHours: (j['workingHours'] ?? 0).toDouble(),
    isLate: j['isLate'] ?? false,
    lateMinutes: j['lateMinutes'] ?? 0,
  );

  bool get isCheckedIn  => checkInTime != null;
  bool get isCheckedOut => checkOutTime != null;
  bool get canCheckOut  => isCheckedIn && !isCheckedOut;
}

// ─── Notification ─────────────────────────────────────────────────────────────
class NotificationModel {
  final int id;
  final String type;
  final String title;
  final String body;
  final bool isRead;
  final DateTime createdAt;

  const NotificationModel({
    required this.id, required this.type, required this.title,
    required this.body, required this.isRead, required this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> j) => NotificationModel(
    id: j['id'] ?? 0,
    type: j['type'] ?? '',
    title: j['title'] ?? '',
    body: j['body'] ?? '',
    isRead: j['isRead'] ?? false,
    createdAt: DateTime.tryParse(j['createdAt'] ?? '') ?? DateTime.now(),
  );
}

// ─── Notice ───────────────────────────────────────────────────────────────────
class NoticeModel {
  final int id;
  final String title;
  final String content;
  final String priority;
  final DateTime expiresAt;

  const NoticeModel({
    required this.id, required this.title, required this.content,
    required this.priority, required this.expiresAt,
  });

  factory NoticeModel.fromJson(Map<String, dynamic> j) => NoticeModel(
    id: j['id'] ?? 0,
    title: j['title'] ?? '',
    content: j['content'] ?? '',
    priority: j['priority'] ?? 'general',
    expiresAt: DateTime.tryParse(j['expiresAt'] ?? '') ?? DateTime.now().add(const Duration(days: 30)),
  );

  Color get priorityColor {
    switch (priority) {
      case 'urgent': return const Color(0xFFEF4444);
      case 'announcement': return const Color(0xFF3B82F6);
      default: return const Color(0xFF6B7280);
    }
  }
}

// ─── Salary ───────────────────────────────────────────────────────────────────
class SalaryModel {
  final int id;
  final int month;
  final int year;
  final int workingDays;
  final double presentDays;
  final double basicSalary;
  final double absentDeduction;
  final double lateDeduction;
  final double netSalary;
  final double bonus;
  final double totalPayout;
  final String status;

  const SalaryModel({
    required this.id, required this.month, required this.year,
    required this.workingDays, required this.presentDays,
    required this.basicSalary, required this.absentDeduction,
    required this.lateDeduction, required this.netSalary,
    required this.bonus, required this.totalPayout, required this.status,
  });

  factory SalaryModel.fromJson(Map<String, dynamic> j) => SalaryModel(
    id: j['id'] ?? 0,
    month: j['month'] ?? 0,
    year: j['year'] ?? 0,
    workingDays: j['workingDays'] ?? 26,
    presentDays: (j['presentDays'] ?? 0).toDouble(),
    basicSalary: (j['basicSalary'] ?? 0).toDouble(),
    absentDeduction: (j['absentDeduction'] ?? 0).toDouble(),
    lateDeduction: (j['lateDeduction'] ?? 0).toDouble(),
    netSalary: (j['netSalary'] ?? 0).toDouble(),
    bonus: (j['bonus'] ?? 0).toDouble(),
    totalPayout: (j['totalPayout'] ?? 0).toDouble(),
    status: j['status'] ?? 'draft',
  );
}

// ─── Target ───────────────────────────────────────────────────────────────────
class TargetModel {
  final int id;
  final String title;
  final String targetType;
  final String metric;
  final double targetValue;
  final double achievedValue;
  final String unit;
  final String status;

  const TargetModel({
    required this.id, required this.title, required this.targetType,
    required this.metric, required this.targetValue, required this.achievedValue,
    required this.unit, required this.status,
  });

  factory TargetModel.fromJson(Map<String, dynamic> j) => TargetModel(
    id: j['id'] ?? 0,
    title: j['title'] ?? '',
    targetType: j['targetType'] ?? 'monthly',
    metric: j['metric'] ?? '',
    targetValue: (j['targetValue'] ?? 0).toDouble(),
    achievedValue: (j['achievedValue'] ?? 0).toDouble(),
    unit: j['unit'] ?? 'count',
    status: j['status'] ?? 'active',
  );

  double get progressPercent => targetValue > 0 ? (achievedValue / targetValue * 100).clamp(0, 100) : 0;
  bool get isAchieved => status == 'achieved';
}

// ─── Leaderboard Entry ────────────────────────────────────────────────────────
class LeaderboardEntry {
  final int rank;
  final int employeeId;
  final String name;
  final String employeeCode;
  final String jobType;
  final int totalPoints;

  const LeaderboardEntry({
    required this.rank, required this.employeeId, required this.name,
    required this.employeeCode, required this.jobType, required this.totalPoints,
  });

  factory LeaderboardEntry.fromJson(Map<String, dynamic> j) => LeaderboardEntry(
    rank: j['rank'] ?? 0,
    employeeId: j['employeeId'] ?? 0,
    name: j['name'] ?? '',
    employeeCode: j['employeeCode'] ?? '',
    jobType: j['jobType'] ?? '',
    totalPoints: j['totalPoints'] ?? 0,
  );
}

// Flutter color import
import 'package:flutter/material.dart';
