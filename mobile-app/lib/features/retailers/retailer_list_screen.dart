import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/providers/providers.dart';
import '../../core/constants/app_constants.dart';

// ════════════════════════════════════════════════════════════════
// RETAILER LIST
// ════════════════════════════════════════════════════════════════
class RetailerListScreen extends ConsumerStatefulWidget {
  const RetailerListScreen({ super.key });
  @override ConsumerState<RetailerListScreen> createState() => _RetailerListState();
}
class _RetailerListState extends ConsumerState<RetailerListScreen> {
  List<dynamic> _items = [];
  bool _loading = true;
  String _filter = '';

  @override void initState() { super.initState(); _fetch(); }

  Future<void> _fetch() async {
    setState(() => _loading = true);
    try {
      final res = await ref.read(dioProvider).get('/retailers/my', queryParameters: { 'limit': 50, if (_filter.isNotEmpty) 'entryType': _filter });
      setState(() => _items = res.data['data'] ?? []);
    } catch (_) {} finally { if (mounted) setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('My Retailers')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/retailers/new').then((_) => _fetch()),
        icon: const Icon(Icons.add), label: const Text('New Entry'),
        backgroundColor: AppColors.secondary, foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Row(children: [
              {'label': 'All', 'value': ''},
              {'label': 'New', 'value': 'new_onboarding'},
              {'label': 'Follow-up', 'value': 'visit_followup'},
              {'label': 'Order', 'value': 'order_generated'},
            ].map((f) => Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(label: Text(f['label']!), selected: _filter == f['value'], onSelected: (_) { setState(() => _filter = f['value']!); _fetch(); }),
            )).toList()),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _items.isEmpty
                ? const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(Icons.store_outlined, size: 60, color: AppColors.textTertiary), SizedBox(height: 12), Text('No retailer entries yet')]))
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _items.length,
                    itemBuilder: (ctx, i) {
                      final r = _items[i];
                      final typeColor = r['entryType'] == 'order_generated' ? AppColors.secondary : r['entryType'] == 'new_onboarding' ? AppColors.primary : AppColors.textSecondary;
                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.border)),
                        child: Row(
                          children: [
                            Container(width: 40, height: 40, decoration: BoxDecoration(color: typeColor.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
                              child: Icon(Icons.store_rounded, color: typeColor, size: 20)),
                            const SizedBox(width: 12),
                            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text(r['retailerName'], style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                              Text(r['shopLocation'] ?? '', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary), maxLines: 1, overflow: TextOverflow.ellipsis),
                            ])),
                            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                              Container(padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                decoration: BoxDecoration(color: typeColor.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
                                child: Text({'new_onboarding': 'New', 'visit_followup': 'Visit', 'order_generated': 'Order'}[r['entryType']] ?? '', style: TextStyle(fontSize: 11, color: typeColor, fontWeight: FontWeight.w600))),
                              const SizedBox(height: 3),
                              Text(r['createdAt'] != null ? DateFormat('d MMM').format(DateTime.parse(r['createdAt'])) : '', style: const TextStyle(fontSize: 11, color: AppColors.textTertiary)),
                            ]),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════
// CALL FORM
// ════════════════════════════════════════════════════════════════
class CallFormScreen extends ConsumerStatefulWidget {
  const CallFormScreen({ super.key });
  @override ConsumerState<CallFormScreen> createState() => _CallFormState();
}
class _CallFormState extends ConsumerState<CallFormScreen> {
  final _nameCtrl  = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  String _callType = 'driver';
  String _outcome  = 'interested';
  DateTime? _followUp;
  bool _saving = false;

  @override void dispose() { _nameCtrl.dispose(); _phoneCtrl.dispose(); _notesCtrl.dispose(); super.dispose(); }

  Future<void> _submit() async {
    if (_nameCtrl.text.isEmpty || _phoneCtrl.text.isEmpty) { _snack('Name and phone required', AppColors.danger); return; }
    setState(() => _saving = true);
    try {
      await ref.read(dioProvider).post('/calls', data: {
        'personName': _nameCtrl.text.trim(),
        'personPhone': _phoneCtrl.text.trim(),
        'callType': _callType,
        'outcome': _outcome,
        'notes': _notesCtrl.text.trim(),
        if (_followUp != null) 'followUpDate': _followUp!.toIso8601String().split('T')[0],
      });
      _snack('Call logged! Points earned 🎉', AppColors.secondary);
      if (mounted) context.pop();
    } catch (e) { _snack(e.toString().replaceAll('Exception: ', ''), AppColors.danger); }
    finally { if (mounted) setState(() => _saving = false); }
  }

  void _snack(String msg, Color c) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: c, behavior: SnackBarBehavior.floating));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Log a Call')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Call Type', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Row(children: [
            _Chip2('Driver', 'driver', _callType, (v) => setState(() => _callType = v)),
            const SizedBox(width: 10),
            _Chip2('Retailer', 'retailer', _callType, (v) => setState(() => _callType = v)),
          ]),
          const SizedBox(height: 16),
          TextField(controller: _nameCtrl, decoration: const InputDecoration(labelText: 'Person Name *', prefixIcon: Icon(Icons.person_outline))),
          const SizedBox(height: 12),
          TextField(controller: _phoneCtrl, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Phone Number *', prefixIcon: Icon(Icons.phone_outlined))),
          const SizedBox(height: 16),
          const Text('Call Outcome *', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8, runSpacing: 8,
            children: AppConstants.callOutcomes.map((o) => _Chip2(
              o.replaceAll('_', ' ').split(' ').map((w) => w[0].toUpperCase() + w.substring(1)).join(' '),
              o, _outcome, (v) => setState(() => _outcome = v),
            )).toList(),
          ),
          const SizedBox(height: 16),
          TextField(controller: _notesCtrl, maxLines: 3, decoration: const InputDecoration(labelText: 'Notes', hintText: 'What was discussed?')),
          const SizedBox(height: 12),
          if (_outcome == 'callback' || _outcome == 'interested') ...[
            const Text('Follow-up Date', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              icon: const Icon(Icons.calendar_today, size: 16),
              label: Text(_followUp != null ? DateFormat('d MMM yyyy').format(_followUp!) : 'Set Follow-up Date'),
              onPressed: () async {
                final d = await showDatePicker(context: context, initialDate: DateTime.now().add(const Duration(days: 1)),
                  firstDate: DateTime.now(), lastDate: DateTime.now().add(const Duration(days: 90)));
                if (d != null && mounted) setState(() => _followUp = d);
              },
            ),
            const SizedBox(height: 16),
          ],
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _saving ? null : _submit,
              style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
              child: _saving ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Submit Call Log'),
            ),
          ),
          const SizedBox(height: 24),
        ]),
      ),
    );
  }
}

class _Chip2 extends StatelessWidget {
  final String label, value, selected; final void Function(String) onTap;
  const _Chip2(this.label, this.value, this.selected, this.onTap);
  @override Widget build(BuildContext context) => GestureDetector(
    onTap: () => onTap(value),
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: selected == value ? AppColors.primaryLight : AppColors.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: selected == value ? AppColors.primary : AppColors.border),
      ),
      child: Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: selected == value ? AppColors.primary : AppColors.textSecondary)),
    ),
  );
}

// ════════════════════════════════════════════════════════════════
// CALL LIST
// ════════════════════════════════════════════════════════════════
class CallListScreen extends ConsumerStatefulWidget {
  const CallListScreen({ super.key });
  @override ConsumerState<CallListScreen> createState() => _CallListState();
}
class _CallListState extends ConsumerState<CallListScreen> {
  List<dynamic> _items = [];
  bool _loading = true;
  String _filter = '';

  @override void initState() { super.initState(); _fetch(); }

  Future<void> _fetch() async {
    setState(() => _loading = true);
    try {
      final res = await ref.read(dioProvider).get('/calls', queryParameters: { 'limit': 50, if (_filter.isNotEmpty) 'outcome': _filter });
      setState(() => _items = res.data['data'] ?? []);
    } catch (_) {} finally { if (mounted) setState(() => _loading = false); }
  }

  final _outcomeColors = { 'converted': AppColors.secondary, 'interested': AppColors.info, 'not_interested': AppColors.danger, 'callback': AppColors.warning, 'no_answer': AppColors.textTertiary, 'busy': AppColors.textTertiary };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Call Logs')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/calls/new').then((_) => _fetch()),
        icon: const Icon(Icons.phone), label: const Text('Log Call'),
        backgroundColor: AppColors.info, foregroundColor: Colors.white,
      ),
      body: Column(children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: Row(children: [
            {'l': 'All', 'v': ''}, {'l': 'Converted', 'v': 'converted'},
            {'l': 'Interested', 'v': 'interested'}, {'l': 'Follow-up', 'v': 'callback'},
          ].map((f) => Padding(padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(label: Text(f['l']!), selected: _filter == f['v'], onSelected: (_) { setState(() => _filter = f['v']!); _fetch(); }))).toList(),
        ),
        Expanded(
          child: _loading ? const Center(child: CircularProgressIndicator()) : _items.isEmpty
            ? const Center(child: Text('No calls logged yet'))
            : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _items.length,
              itemBuilder: (ctx, i) {
                final c = _items[i];
                final oc = _outcomeColors[c['outcome']] ?? AppColors.textTertiary;
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.border)),
                  child: Row(children: [
                    Container(width: 38, height: 38, decoration: BoxDecoration(color: AppColors.info.withOpacity(0.1), shape: BoxShape.circle),
                      child: const Icon(Icons.phone_rounded, color: AppColors.info, size: 18)),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(c['personName'], style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                      Text(c['personPhone'], style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontFamily: 'monospace')),
                      if (c['notes'] != null && c['notes'].toString().isNotEmpty)
                        Text(c['notes'], style: const TextStyle(fontSize: 11, color: AppColors.textTertiary), maxLines: 1, overflow: TextOverflow.ellipsis),
                    ])),
                    Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                      Container(padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                        decoration: BoxDecoration(color: oc.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
                        child: Text(c['outcome'].toString().replaceAll('_', ' '), style: TextStyle(fontSize: 11, color: oc, fontWeight: FontWeight.w600))),
                      if (c['followUpDate'] != null) ...[
                        const SizedBox(height: 3),
                        Row(children: [const Icon(Icons.schedule, size: 11, color: AppColors.warning), const SizedBox(width: 2),
                          Text(DateFormat('d MMM').format(DateTime.parse(c['followUpDate'])), style: const TextStyle(fontSize: 11, color: AppColors.warning))]),
                      ],
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
