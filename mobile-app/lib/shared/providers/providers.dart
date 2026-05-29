import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/api/dio_client.dart';
import '../../core/constants/app_constants.dart';
import '../models/models.dart';

// ─── Dio ─────────────────────────────────────────────────────────────────────
final dioProvider = Provider<Dio>((_) => createDio());

// ─── Auth ─────────────────────────────────────────────────────────────────────
class AuthState {
  final EmployeeModel? employee;
  final AppConfigModel? config;
  final bool isLoading;
  final String? error;

  const AuthState({ this.employee, this.config, this.isLoading = false, this.error });
  bool get isAuthenticated => employee != null;
  AuthState copyWith({ EmployeeModel? employee, AppConfigModel? config, bool? isLoading, String? error }) =>
    AuthState(employee: employee ?? this.employee, config: config ?? this.config, isLoading: isLoading ?? this.isLoading, error: error);
}

class AuthNotifier extends StateNotifier<AuthState> {
  final Dio _dio;
  static const _storage = FlutterSecureStorage();

  AuthNotifier(this._dio) : super(const AuthState()) { _restore(); }

  Future<void> _restore() async {
    final token = await _storage.read(key: AppConstants.accessTokenKey);
    if (token == null) return;
    try {
      final res = await _dio.get('/auth/me');
      final emp = EmployeeModel.fromJson(res.data['data']);
      final config = await _loadConfig();
      state = AuthState(employee: emp, config: config);
    } catch (_) {
      await _storage.deleteAll();
    }
  }

  Future<AppConfigModel?> _loadConfig() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cached = prefs.getString('app_config');
      if (cached != null) return AppConfigModel.fromJson(jsonDecode(cached));
    } catch (_) {}
    return null;
  }

  Future<void> login(String identifier, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final res = await _dio.post('/auth/employee/login', data: {
        'employeeId': identifier,
        'password': password,
      });
      final data = res.data['data'];
      await _storage.write(key: AppConstants.accessTokenKey,  value: data['accessToken']);
      await _storage.write(key: AppConstants.refreshTokenKey, value: data['refreshToken']);

      final emp = EmployeeModel.fromJson(data['employee']);

      // Cache app config
      final configData = data['appConfig'] as Map<String, dynamic>? ?? {};
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('app_config', jsonEncode(configData));
      final config = AppConfigModel.fromJson(configData);

      state = AuthState(employee: emp, config: config);
    } on DioException catch (e) {
      state = state.copyWith(isLoading: false, error: ApiException.from(e).message);
    }
  }

  Future<void> logout() async {
    try { await _dio.post('/auth/logout', data: { 'refreshToken': await _storage.read(key: AppConstants.refreshTokenKey) }); } catch (_) {}
    await _storage.deleteAll();
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    state = const AuthState();
  }

  void setOnDuty(bool v) {
    if (state.employee == null) return;
    state = state.copyWith(employee: state.employee!.copyWith(isOnDuty: v));
  }

  Future<void> refreshConfig() async {
    try {
      final res = await _dio.get('/app-config/public');
      final config = AppConfigModel.fromJson(res.data['data']);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('app_config', jsonEncode(res.data['data']));
      state = state.copyWith(config: config);
    } catch (_) {}
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(dioProvider));
});

// ─── Today's attendance ───────────────────────────────────────────────────────
final todayAttendanceProvider = FutureProvider.autoDispose<AttendanceModel?>((ref) async {
  if (!ref.watch(authProvider).isAuthenticated) return null;
  final dio = ref.watch(dioProvider);
  try {
    final today = DateTime.now().toIso8601String().split('T')[0];
    final res = await dio.get('/attendance/my', queryParameters: { 'date': today });
    final list = res.data['data'] as List?;
    if (list == null || list.isEmpty) return null;
    return AttendanceModel.fromJson(list.first);
  } catch (_) { return null; }
});

// ─── My targets ───────────────────────────────────────────────────────────────
final myTargetsProvider = FutureProvider.autoDispose<List<TargetModel>>((ref) async {
  if (!ref.watch(authProvider).isAuthenticated) return [];
  final dio = ref.watch(dioProvider);
  try {
    final now = DateTime.now();
    final res = await dio.get('/targets', queryParameters: { 'month': now.month, 'year': now.year });
    return (res.data['data'] as List).map((t) => TargetModel.fromJson(t)).toList();
  } catch (_) { return []; }
});

// ─── Notifications ────────────────────────────────────────────────────────────
final notificationsProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  if (!ref.watch(authProvider).isAuthenticated) return {'notifications': [], 'unreadCount': 0};
  final dio = ref.watch(dioProvider);
  try {
    final res = await dio.get('/notifications');
    return res.data['data'];
  } catch (_) { return {'notifications': [], 'unreadCount': 0}; }
});
