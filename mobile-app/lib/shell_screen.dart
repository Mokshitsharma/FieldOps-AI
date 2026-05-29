import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'core/theme/app_theme.dart';
import 'shared/providers/providers.dart';

class ShellScreen extends ConsumerWidget {
  final Widget child;
  const ShellScreen({ super.key, required this.child });

  static const _tabs = [
    _Tab('/home',       Icons.home_outlined,         Icons.home_rounded,          'Home'),
    _Tab('/drivers',    Icons.directions_car_outlined,Icons.directions_car_rounded,'Drivers'),
    _Tab('/retailers',  Icons.store_outlined,         Icons.store_rounded,         'Retailers'),
    _Tab('/calls',      Icons.phone_outlined,         Icons.phone_rounded,         'Calls'),
    _Tab('/leaderboard',Icons.emoji_events_outlined,  Icons.emoji_events_rounded,  'Ranks'),
  ];

  int _currentIndex(BuildContext ctx) {
    final loc = GoRouterState.of(ctx).matchedLocation;
    for (int i = 0; i < _tabs.length; i++) {
      if (loc.startsWith(_tabs[i].path)) return i;
    }
    return 0;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final current = _currentIndex(context);
    final unread = ref.watch(notificationsProvider).value?['unreadCount'] ?? 0;

    return Scaffold(
      body: child,
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          border: const Border(top: BorderSide(color: AppColors.border)),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, -3))],
        ),
        child: SafeArea(
          top: false,
          child: SizedBox(
            height: 58,
            child: Row(
              children: List.generate(_tabs.length, (i) {
                final tab   = _tabs[i];
                final active = i == current;
                return Expanded(
                  child: GestureDetector(
                    onTap: () => context.go(tab.path),
                    behavior: HitTestBehavior.opaque,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Stack(
                          clipBehavior: Clip.none,
                          children: [
                            AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                              decoration: BoxDecoration(
                                color: active ? AppColors.primaryLight : Colors.transparent,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Icon(active ? tab.activeIcon : tab.icon,
                                color: active ? AppColors.primary : AppColors.textTertiary,
                                size: 22),
                            ),
                            // Notification badge on Home
                            if (tab.path == '/home' && unread > 0)
                              Positioned(
                                top: -2, right: -2,
                                child: Container(
                                  width: 16, height: 16,
                                  decoration: const BoxDecoration(color: AppColors.danger, shape: BoxShape.circle),
                                  child: Center(child: Text('$unread', style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w700))),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(tab.label, style: TextStyle(fontSize: 10, fontWeight: active ? FontWeight.w600 : FontWeight.w400, color: active ? AppColors.primary : AppColors.textTertiary)),
                      ],
                    ),
                  ),
                );
              }),
            ),
          ),
        ),
      ),
    );
  }
}

class _Tab {
  final String path;
  final IconData icon;
  final IconData activeIcon;
  final String label;
  const _Tab(this.path, this.icon, this.activeIcon, this.label);
}
