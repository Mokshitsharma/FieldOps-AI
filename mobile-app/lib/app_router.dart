import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'shared/providers/providers.dart';
import 'features/auth/login_screen.dart';
import 'features/home/home_screen.dart';
import 'features/attendance/attendance_screen.dart';
import 'features/drivers/driver_form_screen.dart';
import 'features/drivers/driver_list_screen.dart';
import 'features/retailers/retailer_form_screen.dart';
import 'features/retailers/retailer_list_screen.dart';
import 'features/calls/call_form_screen.dart';
import 'features/calls/call_list_screen.dart';
import 'features/payments/payment_form_screen.dart';
import 'features/reports/daily_report_screen.dart';
import 'features/leaderboard/leaderboard_screen.dart';
import 'features/notices/notices_screen.dart';
import 'features/notices/notes_screen.dart';
import 'features/profile/profile_screen.dart';
import 'shell_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/home',
    redirect: (ctx, state) {
      if (!auth.isAuthenticated && state.matchedLocation != '/login') return '/login';
      if (auth.isAuthenticated  && state.matchedLocation == '/login') return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      ShellRoute(
        builder: (_, __, child) => ShellScreen(child: child),
        routes: [
          GoRoute(path: '/home',        builder: (_, __) => const HomeScreen()),
          GoRoute(path: '/attendance',  builder: (_, __) => const AttendanceScreen()),
          GoRoute(path: '/drivers',     builder: (_, __) => const DriverListScreen()),
          GoRoute(path: '/drivers/new', builder: (_, __) => const DriverFormScreen()),
          GoRoute(path: '/retailers',     builder: (_, __) => const RetailerListScreen()),
          GoRoute(path: '/retailers/new', builder: (_, __) => const RetailerFormScreen()),
          GoRoute(path: '/calls',     builder: (_, __) => const CallListScreen()),
          GoRoute(path: '/calls/new', builder: (_, __) => const CallFormScreen()),
          GoRoute(path: '/payments/new', builder: (_, __) => const PaymentFormScreen()),
          GoRoute(path: '/daily-report', builder: (_, __) => const DailyReportScreen()),
          GoRoute(path: '/leaderboard',  builder: (_, __) => const LeaderboardScreen()),
          GoRoute(path: '/notices',      builder: (_, __) => const NoticesScreen()),
          GoRoute(path: '/notes',        builder: (_, __) => const NotesScreen()),
          GoRoute(path: '/profile',      builder: (_, __) => const ProfileScreen()),
        ],
      ),
    ],
  );
});
