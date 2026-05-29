import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/providers/providers.dart';
import '../../shared/models/models.dart';

// ════════════════════════════════════════════════════════════════
// ATTENDANCE HISTORY
// ════════════════════════════════════════════════════════════════
class AttendanceScreen extends ConsumerStatefulWidget {
  const AttendanceScreen({ super.key });
  @override ConsumerState<AttendanceScreen> createState() => _AttendanceState();
}
class _AttendanceState extends ConsumerState<AttendanceScreen> {
  List<AttendanceModel> _records = [];
  bool _loading = true;

  @override void initState() { super.initState(); _fetch(); }

  Future<void> _fetch() async {
    setState(() => _loading = true);
    try {
      final now = DateTime.now();
      final res = await ref.read(dioProvider).get('/attendance/my', queryParameters: { 'month': now.month, 'year': now.year, 'limit': 31 });
      setState(() => _records = (res.data['data'] as List).map((r) => AttendanceModel.fromJson(r)).toList());
    } catch (_) {} finally { if (mounted) setState(() => _loading = false); }
  }

  Color _statusColor(String s) {
    switch (s) {
      case 'present': return AppColors.secondary;
      case 'absent':  return AppColors.danger;
      case 'half_day':return AppColors.warning;
      default: return AppColors.textTertiary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final present = _records.where((r) => r.status == 'present').length;
    final late    = _records.where((r) => r.isLate).length;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: Text('Attendance — ${DateFormat('MMMM yyyy').format(DateTime.now())}')),
      body: Column(children: [
        Container(color: AppColors.surface, padding: const EdgeInsets.all(16),
          child: Row(children: [
            _StatBubble('Present', '$present', AppColors.secondary),
            const SizedBox(width: 12),
            _StatBubble('Late', '$late', AppColors.warning),
            const SizedBox(width: 12),
            _StatBubble('Absent', '${_records.where((r) => r.status == 'absent').length}', AppColors.danger),
          ]),
        ),
        Expanded(
          child: _loading ? const Center(child: CircularProgressIndicator()) : ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _records.length,
            itemBuilder: (ctx, i) {
              final r = _records[i];
              final color = _statusColor(r.status);
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
                child: Row(children: [
                  Container(width: 36, height: 36, decoration: BoxDecoration(color: color.withOpacity(0.1), shape: BoxShape.circle),
                    child: Center(child: Icon(r.status == 'present' ? Icons.check : r.status == 'absent' ? Icons.close : Icons.timelapse, color: color, size: 18))),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(r.date != '' ? DateFormat('EEEE, d MMM').format(DateTime.tryParse(r.date) ?? DateTime.now()) : r.date,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                    if (r.checkInTime != null)
                      Text('${DateFormat('HH:mm').format(r.checkInTime!)}${r.checkOutTime != null ? ' – ${DateFormat('HH:mm').format(r.checkOutTime!)}' : ''}  (${r.workingHours.toStringAsFixed(1)}h)',
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                  ])),
                  Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                    Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
                      child: Text(r.status.replaceAll('_', ' '), style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600))),
                    if (r.isLate) ...[const SizedBox(height: 3), Text('+${r.lateMinutes}m late', style: const TextStyle(fontSize: 11, color: AppColors.warning))],
                  ]),
                ]),
              );
            },
          ),
        ),
      ]),
    );
  }
}

class _StatBubble extends StatelessWidget {
  final String label, value; final Color color;
  const _StatBubble(this.label, this.value, this.color);
  @override Widget build(BuildContext context) => Expanded(child: Container(
    padding: const EdgeInsets.symmetric(vertical: 12),
    decoration: BoxDecoration(color: color.withOpacity(0.08), borderRadius: BorderRadius.circular(12), border: Border.all(color: color.withOpacity(0.2))),
    child: Column(children: [
      Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: color)),
      const SizedBox(height: 2),
      Text(label, style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w500)),
    ]),
  ));
}

// ════════════════════════════════════════════════════════════════
// LEADERBOARD
// ════════════════════════════════════════════════════════════════
class LeaderboardScreen extends ConsumerStatefulWidget {
  const LeaderboardScreen({ super.key });
  @override ConsumerState<LeaderboardScreen> createState() => _LeaderboardState();
}
class _LeaderboardState extends ConsumerState<LeaderboardScreen> {
  Map<String, dynamic>? _data;
  bool _loading = true;
  String _view = 'company';
  Map<String, dynamic>? _myRank;

  @override void initState() { super.initState(); _fetch(); }

  Future<void> _fetch() async {
    setState(() => _loading = true);
    try {
      final now = DateTime.now();
      final [data, rank] = await Future.wait([
        ref.read(dioProvider).get('/leaderboard', queryParameters: { 'month': now.month, 'year': now.year, 'view': _view }),
        ref.read(dioProvider).get('/leaderboard/my-rank'),
      ]);
      setState(() { _data = data.data['data']; _myRank = rank.data['data']; });
    } catch (_) {} finally { if (mounted) setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    final emp = ref.watch(authProvider).employee;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Leaderboard 🏆')),
      body: Column(children: [
        // My rank card
        if (_myRank != null)
          Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFFF59E0B), Color(0xFFF97316)]), borderRadius: BorderRadius.circular(16)),
            child: Row(children: [
              const Icon(Icons.emoji_events_rounded, color: Colors.white, size: 28),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Your Rank — ${DateFormat('MMMM yyyy').format(DateTime.now())}', style: const TextStyle(color: Colors.white70, fontSize: 12)),
                Text('#${_myRank!['companyRank']} Company  ·  #${_myRank!['roleRank']} ${emp?.isFieldOfficer == true ? 'FO' : 'CT'}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16)),
              ])),
              Column(children: [
                Text('${_myRank!['myPoints']}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 22)),
                const Text('pts', style: TextStyle(color: Colors.white70, fontSize: 12)),
              ]),
            ]),
          ),

        // View toggle
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(children: [
            _ViewBtn('🏢 Company', 'company', _view, (v) { setState(() => _view = v); _fetch(); }),
            const SizedBox(width: 10),
            _ViewBtn('👥 By Role', 'role', _view, (v) { setState(() => _view = v); _fetch(); }),
          ]),
        ),
        const SizedBox(height: 12),

        Expanded(
          child: _loading ? const Center(child: CircularProgressIndicator()) : SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: _view == 'company'
              ? _Board('Company Leaderboard', _data?['leaderboard'] ?? [], emp?.id)
              : Column(children: [
                  _Board('🚗 Field Officers', _data?['fieldOfficers'] ?? [], emp?.id),
                  const SizedBox(height: 16),
                  _Board('📞 Calling Team', _data?['callingTeam'] ?? [], emp?.id),
                ]),
          ),
        ),
      ]),
    );
  }
}

class _ViewBtn extends StatelessWidget {
  final String label, value, current; final void Function(String) onTap;
  const _ViewBtn(this.label, this.value, this.current, this.onTap);
  @override Widget build(BuildContext context) => Expanded(child: GestureDetector(
    onTap: () => onTap(value),
    child: Container(padding: const EdgeInsets.symmetric(vertical: 10), decoration: BoxDecoration(
      color: current == value ? AppColors.primary : AppColors.surface,
      borderRadius: BorderRadius.circular(10), border: Border.all(color: current == value ? AppColors.primary : AppColors.border),
    ), child: Center(child: Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: current == value ? Colors.white : AppColors.textSecondary)))),
  ));
}

class _Board extends StatelessWidget {
  final String title; final List<dynamic> entries; final int? myId;
  const _Board(this.title, this.entries, this.myId);
  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
      const SizedBox(height: 8),
      ...entries.take(10).map((e) {
        final isMe = e['employeeId'] == myId;
        return Container(
          margin: const EdgeInsets.only(bottom: 6),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isMe ? AppColors.primaryLight : AppColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: isMe ? AppColors.primary.withOpacity(0.3) : AppColors.border),
          ),
          child: Row(children: [
            SizedBox(width: 28, child: Text(
              e['rank'] == 1 ? '🥇' : e['rank'] == 2 ? '🥈' : e['rank'] == 3 ? '🥉' : '#${e['rank']}',
              style: TextStyle(fontSize: e['rank'] <= 3 ? 18 : 13, fontWeight: FontWeight.w700, color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            )),
            const SizedBox(width: 10),
            CircleAvatar(radius: 16, backgroundColor: isMe ? AppColors.primary : AppColors.surfaceVariant,
              child: Text((e['name'] ?? 'E')[0].toUpperCase(), style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: isMe ? Colors.white : AppColors.textPrimary))),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(e['name'] ?? '', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: isMe ? AppColors.primary : AppColors.textPrimary)),
              Text(e['employeeCode'] ?? '', style: const TextStyle(fontSize: 11, color: AppColors.textTertiary)),
            ])),
            Text('${e['totalPoints']} pts', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: isMe ? AppColors.primary : AppColors.textPrimary)),
          ]),
        );
      }).toList(),
    ]);
  }
}

// ════════════════════════════════════════════════════════════════
// NOTICES
// ════════════════════════════════════════════════════════════════
class NoticesScreen extends ConsumerStatefulWidget {
  const NoticesScreen({ super.key });
  @override ConsumerState<NoticesScreen> createState() => _NoticesState();
}
class _NoticesState extends ConsumerState<NoticesScreen> {
  List<NoticeModel> _notices = [];
  bool _loading = true;

  @override void initState() { super.initState(); _fetch(); }

  Future<void> _fetch() async {
    setState(() => _loading = true);
    try {
      final res = await ref.read(dioProvider).get('/notices');
      setState(() => _notices = (res.data['data'] as List).map((n) => NoticeModel.fromJson(n)).toList());
    } catch (_) {} finally { if (mounted) setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Notices')),
      body: _loading ? const Center(child: CircularProgressIndicator()) : _notices.isEmpty
        ? const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(Icons.campaign_outlined, size: 60, color: AppColors.textTertiary),
            SizedBox(height: 12), Text('No notices right now'),
          ]))
        : ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _notices.length,
            itemBuilder: (ctx, i) {
              final n = _notices[i];
              final isUrgent = n.priority == 'urgent';
              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isUrgent ? AppColors.dangerLight : n.priority == 'announcement' ? AppColors.primaryLight : AppColors.surface,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: isUrgent ? AppColors.danger.withOpacity(0.3) : AppColors.border),
                ),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Icon(isUrgent ? Icons.warning_amber_rounded : Icons.campaign_rounded, color: n.priorityColor, size: 20),
                    const SizedBox(width: 8),
                    Expanded(child: Text(n.title, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: n.priorityColor))),
                    Container(padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(color: n.priorityColor.withOpacity(0.15), borderRadius: BorderRadius.circular(6)),
                      child: Text(n.priority.toUpperCase(), style: TextStyle(fontSize: 10, color: n.priorityColor, fontWeight: FontWeight.w700))),
                  ]),
                  const SizedBox(height: 8),
                  Text(n.content, style: const TextStyle(fontSize: 14, color: AppColors.textPrimary, height: 1.5)),
                  const SizedBox(height: 8),
                  Text('Expires ${DateFormat('d MMM yyyy').format(n.expiresAt)}', style: const TextStyle(fontSize: 11, color: AppColors.textTertiary)),
                ]),
              );
            },
          ),
    );
  }
}

// ════════════════════════════════════════════════════════════════
// NOTES (2-way)
// ════════════════════════════════════════════════════════════════
class NotesScreen extends ConsumerStatefulWidget {
  const NotesScreen({ super.key });
  @override ConsumerState<NotesScreen> createState() => _NotesState();
}
class _NotesState extends ConsumerState<NotesScreen> {
  List<dynamic> _notes = [];
  bool _loading = true;
  Map<String, dynamic>? _selectedNote;
  final _replyCtrl = TextEditingController();
  bool _sending = false;

  @override void initState() { super.initState(); _fetch(); }
  @override void dispose() { _replyCtrl.dispose(); super.dispose(); }

  Future<void> _fetch() async {
    setState(() => _loading = true);
    try {
      final res = await ref.read(dioProvider).get('/notes/my');
      setState(() => _notes = res.data['data'] ?? []);
    } catch (_) {} finally { if (mounted) setState(() => _loading = false); }
  }

  Future<void> _sendReply(int noteId) async {
    if (_replyCtrl.text.trim().isEmpty) return;
    setState(() => _sending = true);
    try {
      await ref.read(dioProvider).post('/notes/$noteId/reply', data: { 'content': _replyCtrl.text.trim() });
      _replyCtrl.clear();
      _fetch();
    } catch (_) {} finally { if (mounted) setState(() => _sending = false); }
  }

  @override
  Widget build(BuildContext context) {
    final myId = ref.watch(authProvider).employee?.id;

    if (_selectedNote != null) {
      final note = _selectedNote!;
      final replies = note['NoteReplies'] as List? ?? [];
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(title: Text(note['title'] ?? 'Note'), leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => setState(() => _selectedNote = null))),
        body: Column(children: [
          Container(padding: const EdgeInsets.all(14), color: AppColors.primaryLight,
            child: Text(note['content'] ?? '', style: const TextStyle(fontSize: 14, color: AppColors.textPrimary, height: 1.5))),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: replies.length,
              itemBuilder: (ctx, i) {
                final r = replies[i];
                final isMe = r['senderRole'] == 'employee';
                return Align(
                  alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: isMe ? AppColors.primary : AppColors.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: isMe ? null : Border.all(color: AppColors.border),
                    ),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      if (!isMe) Text(r['senderName'] ?? 'Admin', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.primary)),
                      Text(r['content'] ?? '', style: TextStyle(fontSize: 14, color: isMe ? Colors.white : AppColors.textPrimary)),
                      Text(
                        r['createdAt'] != null ? DateFormat('d MMM, HH:mm').format(DateTime.parse(r['createdAt'])) : '',
                        style: TextStyle(fontSize: 10, color: isMe ? Colors.white60 : AppColors.textTertiary),
                      ),
                    ]),
                  ),
                );
              },
            ),
          ),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: const BoxDecoration(color: AppColors.surface, border: Border(top: BorderSide(color: AppColors.border))),
            child: Row(children: [
              Expanded(child: TextField(controller: _replyCtrl, decoration: const InputDecoration(hintText: 'Type a reply...', contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 10)))),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: _sending ? null : () => _sendReply(note['id']),
                child: Container(width: 44, height: 44, decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                  child: _sending ? const Padding(padding: EdgeInsets.all(10), child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.send_rounded, color: Colors.white, size: 20)),
              ),
            ]),
          ),
        ]),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('My Notes')),
      body: _loading ? const Center(child: CircularProgressIndicator()) : _notes.isEmpty
        ? const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(Icons.sticky_note_2_outlined, size: 60, color: AppColors.textTertiary),
            SizedBox(height: 12), Text('No notes yet'),
          ]))
        : ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _notes.length,
            itemBuilder: (ctx, i) {
              final n = _notes[i];
              final replies = (n['NoteReplies'] as List?)?.length ?? 0;
              final isRead = n['isRead'] == true;
              return GestureDetector(
                onTap: () async {
                  setState(() => _selectedNote = n);
                  await ref.read(dioProvider).patch('/notes/${n['id']}/read').catchError((_) {});
                },
                child: Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isRead ? AppColors.surface : AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: isRead ? AppColors.border : AppColors.primary.withOpacity(0.3)),
                  ),
                  child: Row(children: [
                    const Icon(Icons.sticky_note_2_rounded, color: AppColors.primary, size: 20),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(n['title'] ?? '', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: isRead ? AppColors.textPrimary : AppColors.primary)),
                      Text(n['content'] ?? '', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary), maxLines: 1, overflow: TextOverflow.ellipsis),
                    ])),
                    if (replies > 0) Container(padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(10)),
                      child: Text('$replies', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700))),
                    if (!isRead) ...[const SizedBox(width: 6), Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle))],
                  ]),
                ),
              );
            },
          ),
    );
  }
}

// ════════════════════════════════════════════════════════════════
// PROFILE
// ════════════════════════════════════════════════════════════════
class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({ super.key });
  @override ConsumerState<ProfileScreen> createState() => _ProfileState();
}
class _ProfileState extends ConsumerState<ProfileScreen> {
  List<SalaryModel> _salaries = [];
  List<TargetModel> _targets  = [];

  @override
  void initState() {
    super.initState();
    _loadSalary();
    _loadTargets();
  }

  Future<void> _loadSalary() async {
    try {
      final res = await ref.read(dioProvider).get('/salary');
      setState(() => _salaries = (res.data['data'] as List).map((s) => SalaryModel.fromJson(s)).toList());
    } catch (_) {}
  }

  Future<void> _loadTargets() async {
    try {
      final now = DateTime.now();
      final res = await ref.read(dioProvider).get('/targets', queryParameters: { 'month': now.month, 'year': now.year });
      setState(() => _targets = (res.data['data'] as List).map((t) => TargetModel.fromJson(t)).toList());
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final emp = ref.watch(authProvider).employee;
    if (emp == null) return const SizedBox();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('My Profile')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          // Avatar + name
          Container(width: double.infinity, padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.border)),
            child: Column(children: [
              CircleAvatar(radius: 36, backgroundColor: AppColors.primaryLight,
                child: Text(emp.name[0].toUpperCase(), style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: AppColors.primary))),
              const SizedBox(height: 10),
              Text(emp.name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
              Text(emp.designation, style: const TextStyle(color: AppColors.textSecondary, fontSize: 14)),
              const SizedBox(height: 8),
              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: AppColors.primaryLight, borderRadius: BorderRadius.circular(8)),
                  child: Text(emp.employeeId, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.primary, fontFamily: 'monospace'))),
                const SizedBox(width: 8),
                Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: emp.isFieldOfficer ? AppColors.primaryLight : const Color(0xFFE0F7FA), borderRadius: BorderRadius.circular(8)),
                  child: Text(emp.isFieldOfficer ? 'Field Officer' : 'Calling Team',
                    style: TextStyle(fontWeight: FontWeight.w600, color: emp.isFieldOfficer ? AppColors.primary : AppColors.info, fontSize: 12))),
              ]),
              const SizedBox(height: 10),
              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                const Icon(Icons.star_rounded, color: Color(0xFFF59E0B), size: 18),
                const SizedBox(width: 4),
                Text('${emp.currentMonthPoints} pts this month', style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
              ]),
            ]),
          ),
          const SizedBox(height: 14),

          // Info
          _InfoCard(items: [
            _InfoRow(Icons.phone_outlined, 'Phone', emp.phone),
            _InfoRow(Icons.currency_rupee, 'Basic Salary', '₹${emp.basicSalary.toStringAsFixed(0)}'),
            _InfoRow(Icons.location_on_outlined, 'Zones', emp.zones.isEmpty ? 'Not assigned' : emp.zones.map((z) => z.name).join(', ')),
          ]),
          const SizedBox(height: 14),

          // This month's targets
          if (_targets.isNotEmpty) ...[
            _SectionTitle('This Month\'s Targets'),
            ..._targets.map((t) => Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Expanded(child: Text(t.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
                  Text('${t.achievedValue.toStringAsFixed(0)}/${t.targetValue.toStringAsFixed(0)} ${t.unit}', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                ]),
                const SizedBox(height: 6),
                ClipRRect(borderRadius: BorderRadius.circular(4), child: LinearProgressIndicator(
                  value: t.progressPercent / 100,
                  backgroundColor: AppColors.surfaceVariant,
                  color: t.isAchieved ? AppColors.secondary : AppColors.primary,
                  minHeight: 6,
                )),
                const SizedBox(height: 4),
                Text('${t.progressPercent.toStringAsFixed(0)}% complete', style: TextStyle(fontSize: 11, color: t.isAchieved ? AppColors.secondary : AppColors.textTertiary)),
              ]),
            )),
            const SizedBox(height: 14),
          ],

          // Salary
          if (_salaries.isNotEmpty) ...[
            _SectionTitle('Salary Records'),
            ..._salaries.take(3).map((s) => Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
              child: Row(children: [
                const Icon(Icons.receipt_long_outlined, color: AppColors.primary, size: 20),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('${DateFormat('MMMM yyyy').format(DateTime(s.year, s.month))}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                  Text('Basic: ₹${s.basicSalary.toStringAsFixed(0)}  |  ${s.presentDays.toStringAsFixed(0)}/${s.workingDays} days', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                ])),
                Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Text('₹${s.totalPayout.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: AppColors.primary)),
                  Container(padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: s.status == 'paid' ? AppColors.successLight : s.status == 'approved' ? AppColors.primaryLight : AppColors.surfaceVariant,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(s.status, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600,
                      color: s.status == 'paid' ? AppColors.secondary : s.status == 'approved' ? AppColors.primary : AppColors.textSecondary))),
                ]),
              ]),
            )),
          ],

          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              icon: const Icon(Icons.logout, color: AppColors.danger),
              label: const Text('Sign Out', style: TextStyle(color: AppColors.danger)),
              style: OutlinedButton.styleFrom(side: const BorderSide(color: AppColors.danger), padding: const EdgeInsets.symmetric(vertical: 14)),
              onPressed: () async {
                await ref.read(authProvider.notifier).logout();
                if (context.mounted) context.go('/login');
              },
            ),
          ),
          const SizedBox(height: 24),
        ]),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String t;
  const _SectionTitle(this.t);
  @override Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Text(t, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
  );
}

class _InfoCard extends StatelessWidget {
  final List<_InfoRow> items;
  const _InfoCard({ required this.items });
  @override Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.border)),
    child: Column(children: items.asMap().entries.map((e) => Column(children: [
      if (e.key > 0) const Divider(height: 1, indent: 48),
      Padding(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(children: [
          Icon(e.value.icon, size: 18, color: AppColors.textSecondary),
          const SizedBox(width: 12),
          Text(e.value.label, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
          const Spacer(),
          Flexible(child: Text(e.value.value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600), textAlign: TextAlign.right)),
        ])),
    ])).toList()),
  );
}

class _InfoRow {
  final IconData icon; final String label, value;
  const _InfoRow(this.icon, this.label, this.value);
}
