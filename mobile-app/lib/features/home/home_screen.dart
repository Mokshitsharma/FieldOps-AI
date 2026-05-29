import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/providers/providers.dart';
import '../../shared/models/models.dart';
import '../location/location_service.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({ super.key });
  @override ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  bool _dutyLoading = false;
  int? _activeZoneId;
  List<NoticeModel> _notices = [];

  @override
  void initState() {
    super.initState();
    _loadNotices();
  }

  Future<void> _loadNotices() async {
    try {
      final dio = ref.read(dioProvider);
      final res = await dio.get('/notices', queryParameters: { 'limit': 3 });
      setState(() {
        _notices = (res.data['data'] as List).map((n) => NoticeModel.fromJson(n)).toList();
      });
    } catch (_) {}
  }

  Future<void> _toggleDuty() async {
    final auth = ref.read(authProvider);
    final emp  = auth.employee;
    if (emp == null) return;

    setState(() => _dutyLoading = true);
    final dio = ref.read(dioProvider);

    try {
      if (emp.isOnDuty) {
        // Check out
        final pos = await LocationService.getOnce();
        await dio.post('/attendance/check-out', data: {
          if (pos != null) 'lat': pos.latitude,
          if (pos != null) 'lng': pos.longitude,
        });
        await LocationService.stopTracking(dio, emp.id);
        ref.read(authProvider.notifier).setOnDuty(false);
        _showSnack('Checked out — have a great day! 👋', AppColors.secondary);
      } else {
        // Check in — pick zone if field officer
        if (emp.isFieldOfficer && emp.zones.isNotEmpty) {
          await _pickZone(emp.zones);
        }

        final pos = await LocationService.getOnce();
        if (pos == null && emp.isFieldOfficer) {
          _showSnack('Cannot get GPS location. Please enable location.', AppColors.warning);
          setState(() => _dutyLoading = false);
          return;
        }
        await dio.post('/attendance/check-in', data: {
          if (pos != null) 'lat': pos.latitude,
          if (pos != null) 'lng': pos.longitude,
        });

        // Start GPS for field officers only
        if (emp.isFieldOfficer) {
          final interval = auth.config?.locationInterval ?? 60;
          await LocationService.startTracking(
            dio: dio, employeeId: emp.id,
            zoneId: _activeZoneId, intervalSeconds: interval,
          );
        }

        ref.read(authProvider.notifier).setOnDuty(true);
        _showSnack('Checked in — good luck today! 🚀', AppColors.secondary);
      }
    } catch (e) {
      _showSnack(e.toString().replaceAll('Exception: ', ''), AppColors.danger);
    } finally {
      if (mounted) setState(() => _dutyLoading = false);
      ref.invalidate(todayAttendanceProvider);
    }
  }

  Future<void> _pickZone(List<ZoneModel> zones) async {
    await showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Select Your Zone Today', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8, runSpacing: 8,
              children: zones.map((z) => GestureDetector(
                onTap: () { setState(() => _activeZoneId = z.id); Navigator.pop(ctx); },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: _activeZoneId == z.id ? AppColors.primaryLight : AppColors.surfaceVariant,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: _activeZoneId == z.id ? AppColors.primary : AppColors.border),
                  ),
                  child: Text(z.name, style: TextStyle(fontSize: 13, color: _activeZoneId == z.id ? AppColors.primary : AppColors.textPrimary, fontWeight: FontWeight.w500)),
                ),
              )).toList(),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  void _showSnack(String msg, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg), backgroundColor: color, behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final auth    = ref.watch(authProvider);
    final emp     = auth.employee;
    final todayAtt = ref.watch(todayAttendanceProvider);
    final unread  = ref.watch(notificationsProvider).value?['unreadCount'] ?? 0;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            // ── Header gradient ──
            SliverToBoxAdapter(
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(colors: [AppColors.primary, AppColors.primaryDark], begin: Alignment.topLeft, end: Alignment.bottomRight),
                ),
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(_greeting(), style: const TextStyle(color: Colors.white70, fontSize: 13)),
                              const SizedBox(height: 3),
                              Text(emp?.name ?? '', style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
                              Text(emp?.designation ?? '', style: const TextStyle(color: Colors.white60, fontSize: 12)),
                            ],
                          ),
                        ),
                        // Notifications bell
                        GestureDetector(
                          onTap: () => context.push('/notices'),
                          child: Stack(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), shape: BoxShape.circle),
                                child: const Icon(Icons.notifications_outlined, color: Colors.white, size: 22),
                              ),
                              if (unread > 0)
                                Positioned(top: 0, right: 0,
                                  child: Container(
                                    width: 16, height: 16,
                                    decoration: const BoxDecoration(color: AppColors.danger, shape: BoxShape.circle),
                                    child: Center(child: Text('$unread', style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w700))),
                                  ),
                                ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        GestureDetector(
                          onTap: () => context.push('/profile'),
                          child: CircleAvatar(
                            radius: 20,
                            backgroundColor: Colors.white.withOpacity(0.2),
                            child: Text(emp?.name[0].toUpperCase() ?? 'E', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 17)),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text(DateFormat('EEEE, d MMMM').format(DateTime.now()), style: const TextStyle(color: Colors.white70, fontSize: 12)),
                  ],
                ),
              ),
            ),

            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ── Duty card ──
                    _DutyCard(
                      isOnDuty: emp?.isOnDuty ?? false,
                      loading: _dutyLoading,
                      attendance: todayAtt.value,
                      onToggle: _toggleDuty,
                      activeZone: _activeZoneId != null
                        ? emp?.zones.firstWhere((z) => z.id == _activeZoneId, orElse: () => emp!.zones.first).name
                        : null,
                    ),
                    const SizedBox(height: 16),

                    // ── Today stats ──
                    if (todayAtt.value != null) _TodayStats(att: todayAtt.value!),
                    const SizedBox(height: 16),

                    // ── Points banner ──
                    if (emp != null && emp.currentMonthPoints > 0)
                      _PointsBanner(points: emp.currentMonthPoints),
                    if (emp != null && emp.currentMonthPoints > 0)
                      const SizedBox(height: 16),

                    // ── Notices ──
                    if (_notices.isNotEmpty) ...[
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Notices', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                          GestureDetector(onTap: () => context.push('/notices'), child: const Text('See all', style: TextStyle(fontSize: 13, color: AppColors.primary))),
                        ],
                      ),
                      const SizedBox(height: 8),
                      ..._notices.map((n) => _NoticeCard(notice: n)),
                      const SizedBox(height: 16),
                    ],

                    // ── Quick actions ──
                    const Text('Quick Actions', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 12),
                    _QuickActions(emp: emp),
                    const SizedBox(height: 80),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good morning,';
    if (h < 17) return 'Good afternoon,';
    return 'Good evening,';
  }
}

// ── Duty Toggle Card ──────────────────────────────────────────────────────────
class _DutyCard extends StatelessWidget {
  final bool isOnDuty, loading;
  final AttendanceModel? attendance;
  final VoidCallback onToggle;
  final String? activeZone;
  const _DutyCard({ required this.isOnDuty, required this.loading, this.attendance, required this.onToggle, this.activeZone });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: isOnDuty ? AppColors.secondary.withOpacity(0.4) : AppColors.border),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 3))],
      ),
      child: Row(
        children: [
          Container(
            width: 52, height: 52,
            decoration: BoxDecoration(
              color: isOnDuty ? AppColors.successLight : AppColors.surfaceVariant,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(isOnDuty ? Icons.work_rounded : Icons.work_off_rounded,
              color: isOnDuty ? AppColors.secondary : AppColors.textSecondary, size: 26),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(isOnDuty ? 'On Duty' : 'Off Duty',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700,
                    color: isOnDuty ? AppColors.secondary : AppColors.textPrimary)),
                const SizedBox(height: 2),
                Text(
                  attendance?.checkInTime != null
                    ? 'In at ${DateFormat('HH:mm').format(attendance!.checkInTime!)}'
                    : isOnDuty ? 'Tracking your location' : 'Tap to start your day',
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
                if (activeZone != null) ...[
                  const SizedBox(height: 3),
                  Row(children: [
                    const Icon(Icons.location_on, size: 12, color: AppColors.primary),
                    const SizedBox(width: 3),
                    Text(activeZone!, style: const TextStyle(fontSize: 11, color: AppColors.primary, fontWeight: FontWeight.w600)),
                  ]),
                ],
                if (attendance?.isLate == true)
                  Container(
                    margin: const EdgeInsets.only(top: 4),
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(color: AppColors.warningLight, borderRadius: BorderRadius.circular(6)),
                    child: Text('Late by ${attendance!.lateMinutes}m', style: const TextStyle(fontSize: 11, color: AppColors.warning, fontWeight: FontWeight.w600)),
                  ),
              ],
            ),
          ),
          GestureDetector(
            onTap: loading ? null : onToggle,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 52, height: 30,
              decoration: BoxDecoration(
                color: isOnDuty ? AppColors.secondary : AppColors.border,
                borderRadius: BorderRadius.circular(15),
              ),
              child: loading
                ? const Padding(padding: EdgeInsets.all(5), child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : AnimatedAlign(
                    duration: const Duration(milliseconds: 200),
                    alignment: isOnDuty ? Alignment.centerRight : Alignment.centerLeft,
                    child: Container(margin: const EdgeInsets.all(3), width: 24, height: 24, decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle)),
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Today Stats ───────────────────────────────────────────────────────────────
class _TodayStats extends StatelessWidget {
  final AttendanceModel att;
  const _TodayStats({ required this.att });
  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _Stat('Check In',  att.checkInTime  != null ? DateFormat('HH:mm').format(att.checkInTime!)  : '—'),
        const SizedBox(width: 10),
        _Stat('Check Out', att.checkOutTime != null ? DateFormat('HH:mm').format(att.checkOutTime!) : '—'),
        const SizedBox(width: 10),
        _Stat('Hours', att.workingHours > 0 ? '${att.workingHours.toStringAsFixed(1)}h' : '—'),
      ],
    );
  }
}

class _Stat extends StatelessWidget {
  final String label, value;
  const _Stat(this.label, this.value);
  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
      child: Column(children: [
        Text(value, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textSecondary)),
      ]),
    ),
  );
}

// ── Points Banner ─────────────────────────────────────────────────────────────
class _PointsBanner extends StatelessWidget {
  final int points;
  const _PointsBanner({ required this.points });
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    decoration: BoxDecoration(
      gradient: const LinearGradient(colors: [Color(0xFFF59E0B), Color(0xFFF97316)]),
      borderRadius: BorderRadius.circular(14),
    ),
    child: Row(
      children: [
        const Icon(Icons.emoji_events_rounded, color: Colors.white, size: 22),
        const SizedBox(width: 10),
        Text('$points pts this month', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14)),
        const Spacer(),
        GestureDetector(
          onTap: () => GoRouter.of(context).push('/leaderboard'),
          child: const Text('View Rank →', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
        ),
      ],
    ),
  );
}

// ── Notice Card ────────────────────────────────────────────────────────────────
class _NoticeCard extends StatelessWidget {
  final NoticeModel notice;
  const _NoticeCard({ required this.notice });
  @override
  Widget build(BuildContext context) {
    final isUrgent = notice.priority == 'urgent';
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isUrgent ? AppColors.dangerLight : AppColors.primaryLight,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: isUrgent ? AppColors.danger.withOpacity(0.3) : AppColors.primary.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          Icon(isUrgent ? Icons.warning_amber_rounded : Icons.campaign_rounded,
            color: isUrgent ? AppColors.danger : AppColors.primary, size: 18),
          const SizedBox(width: 10),
          Expanded(child: Text(notice.title, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: isUrgent ? AppColors.danger : AppColors.primary))),
        ],
      ),
    );
  }
}

// ── Quick Actions Grid ────────────────────────────────────────────────────────
class _QuickActions extends StatelessWidget {
  final EmployeeModel? emp;
  const _QuickActions({ this.emp });

  @override
  Widget build(BuildContext context) {
    final isFieldOfficer = emp?.isFieldOfficer ?? true;
    final isCallingTeam  = emp?.isCallingTeam  ?? false;

    final actions = [
      if (isFieldOfficer) _Action(Icons.directions_car_rounded, 'New Driver',   const Color(0xFF6366F1), '/drivers/new'),
      if (isFieldOfficer) _Action(Icons.store_rounded,          'New Retailer', const Color(0xFF10B981), '/retailers/new'),
      if (isCallingTeam)  _Action(Icons.phone_rounded,          'Log Call',     const Color(0xFF3B82F6), '/calls/new'),
      _Action(Icons.payment_rounded,         'Payment',     const Color(0xFFF59E0B), '/payments/new'),
      _Action(Icons.assignment_rounded,      'Daily Report',const Color(0xFF8B5CF6), '/daily-report'),
      _Action(Icons.emoji_events_rounded,    'Leaderboard', const Color(0xFFF97316), '/leaderboard'),
      _Action(Icons.calendar_today_outlined, 'Attendance',  const Color(0xFF06B6D4), '/attendance'),
      _Action(Icons.campaign_rounded,        'Notices',     const Color(0xFFEF4444), '/notices'),
      _Action(Icons.sticky_note_2_outlined,  'My Notes',    const Color(0xFF64748B), '/notes'),
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 3, mainAxisSpacing: 10, crossAxisSpacing: 10, childAspectRatio: 1),
      itemCount: actions.length,
      itemBuilder: (ctx, i) {
        final a = actions[i];
        return GestureDetector(
          onTap: () => context.push(a.path),
          child: Container(
            decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.border)),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(width: 42, height: 42, decoration: BoxDecoration(color: a.color.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
                  child: Icon(a.icon, color: a.color, size: 20)),
                const SizedBox(height: 7),
                Text(a.label, textAlign: TextAlign.center, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _Action {
  final IconData icon; final String label; final Color color; final String path;
  const _Action(this.icon, this.label, this.color, this.path);
}
