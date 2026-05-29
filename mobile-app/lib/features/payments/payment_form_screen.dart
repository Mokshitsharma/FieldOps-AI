import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:dio/dio.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/providers/providers.dart';
import '../../shared/models/models.dart';

// ════════════════════════════════════════════════════════════════
// PAYMENT FORM
// ════════════════════════════════════════════════════════════════
class PaymentFormScreen extends ConsumerStatefulWidget {
  const PaymentFormScreen({ super.key });
  @override ConsumerState<PaymentFormScreen> createState() => _PaymentFormState();
}
class _PaymentFormState extends ConsumerState<PaymentFormScreen> {
  final _nameCtrl   = TextEditingController();
  final _phoneCtrl  = TextEditingController();
  final _amountCtrl = TextEditingController();
  final _upiCtrl    = TextEditingController();
  String _type   = 'field';
  String _method = 'cash';
  File? _receipt;
  bool _saving = false;

  @override void dispose() { _nameCtrl.dispose(); _phoneCtrl.dispose(); _amountCtrl.dispose(); _upiCtrl.dispose(); super.dispose(); }

  Future<void> _submit() async {
    if (_nameCtrl.text.isEmpty || _amountCtrl.text.isEmpty) { _snack('Name and amount required', AppColors.danger); return; }
    setState(() => _saving = true);
    try {
      final data = FormData.fromMap({
        'collectionType': _type,
        'driverName': _nameCtrl.text.trim(),
        'driverPhone': _phoneCtrl.text.trim(),
        'amount': double.parse(_amountCtrl.text),
        'paymentMethod': _method,
        if (_method == 'upi' && _upiCtrl.text.isNotEmpty) 'upiTransactionId': _upiCtrl.text.trim(),
        if (_receipt != null) 'receipt': await MultipartFile.fromFile(_receipt!.path, filename: 'receipt.jpg'),
      });
      await ref.read(dioProvider).post('/payments', data: data);
      _snack('Payment collection recorded! 🎉', AppColors.secondary);
      if (mounted) context.pop();
    } catch (e) { _snack(e.toString().replaceAll('Exception: ', ''), AppColors.danger); }
    finally { if (mounted) setState(() => _saving = false); }
  }

  void _snack(String m, Color c) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m), backgroundColor: c, behavior: SnackBarBehavior.floating));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Log Payment Collection')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Collection Type', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Row(children: [
            _Chip3('Field Collection', 'field', _type, (v) => setState(() => _type = v)),
            const SizedBox(width: 10),
            _Chip3('Calling Collection', 'calling', _type, (v) => setState(() => _type = v)),
          ]),
          const SizedBox(height: 16),
          TextField(controller: _nameCtrl, decoration: const InputDecoration(labelText: 'Driver Name *', prefixIcon: Icon(Icons.person_outline))),
          const SizedBox(height: 12),
          TextField(controller: _phoneCtrl, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Driver Phone', prefixIcon: Icon(Icons.phone_outlined))),
          const SizedBox(height: 12),
          TextField(controller: _amountCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Amount (₹) *', prefixIcon: Icon(Icons.currency_rupee), prefixText: '₹ ')),
          const SizedBox(height: 16),
          const Text('Payment Method', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Row(children: [
            _Chip3('Cash', 'cash', _method, (v) => setState(() => _method = v)),
            const SizedBox(width: 10),
            _Chip3('UPI', 'upi', _method, (v) => setState(() => _method = v)),
          ]),
          if (_method == 'upi') ...[
            const SizedBox(height: 12),
            TextField(controller: _upiCtrl, decoration: const InputDecoration(labelText: 'UPI Transaction ID', prefixIcon: Icon(Icons.receipt_outlined))),
          ],
          const SizedBox(height: 16),
          OutlinedButton.icon(
            icon: Icon(_receipt != null ? Icons.check_circle : Icons.camera_alt_outlined),
            label: Text(_receipt != null ? 'Receipt added ✓' : 'Attach Receipt Photo'),
            onPressed: () async {
              final f = await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 70);
              if (f != null && mounted) setState(() => _receipt = File(f.path));
            },
            style: OutlinedButton.styleFrom(foregroundColor: _receipt != null ? AppColors.secondary : AppColors.primary),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _saving ? null : _submit,
              style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
              child: _saving ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Submit Payment Collection'),
            ),
          ),
          const SizedBox(height: 24),
        ]),
      ),
    );
  }
}

class _Chip3 extends StatelessWidget {
  final String label, value, selected; final void Function(String) onTap;
  const _Chip3(this.label, this.value, this.selected, this.onTap);
  @override Widget build(BuildContext context) => GestureDetector(
    onTap: () => onTap(value),
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
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
// DAILY REPORT
// ════════════════════════════════════════════════════════════════
class DailyReportScreen extends ConsumerStatefulWidget {
  const DailyReportScreen({ super.key });
  @override ConsumerState<DailyReportScreen> createState() => _DailyReportState();
}
class _DailyReportState extends ConsumerState<DailyReportScreen> {
  final _issuesCtrl  = TextEditingController();
  final _tomorrowCtrl = TextEditingController();
  final _notesCtrl   = TextEditingController();
  final Map<String, TextEditingController> _counters = {
    'driversContacted': TextEditingController(text: '0'),
    'driversOnboarded': TextEditingController(text: '0'),
    'retailersVisited': TextEditingController(text: '0'),
    'retailersOnboarded': TextEditingController(text: '0'),
    'ordersGenerated': TextEditingController(text: '0'),
    'callsMade': TextEditingController(text: '0'),
    'conversions': TextEditingController(text: '0'),
    'opsIssuesSolved': TextEditingController(text: '0'),
  };
  bool _saving = false;
  bool _alreadySubmitted = false;

  @override
  void initState() {
    super.initState();
    _checkAlreadySubmitted();
  }

  Future<void> _checkAlreadySubmitted() async {
    try {
      final today = DateTime.now().toIso8601String().split('T')[0];
      final res = await ref.read(dioProvider).get('/daily-reports', queryParameters: { 'date': today });
      final data = res.data['data'] as List?;
      if (data != null && data.isNotEmpty) setState(() => _alreadySubmitted = true);
    } catch (_) {}
  }

  @override void dispose() { _issuesCtrl.dispose(); _tomorrowCtrl.dispose(); _notesCtrl.dispose(); _counters.values.forEach((c) => c.dispose()); super.dispose(); }

  Future<void> _submit() async {
    setState(() => _saving = true);
    try {
      final emp = ref.read(authProvider).employee;
      final isFieldOfficer = emp?.isFieldOfficer ?? false;
      await ref.read(dioProvider).post('/daily-reports', data: {
        'driversContacted':    int.tryParse(_counters['driversContacted']!.text) ?? 0,
        'driversOnboarded':    int.tryParse(_counters['driversOnboarded']!.text) ?? 0,
        if (isFieldOfficer) 'retailersVisited':   int.tryParse(_counters['retailersVisited']!.text) ?? 0,
        if (isFieldOfficer) 'retailersOnboarded': int.tryParse(_counters['retailersOnboarded']!.text) ?? 0,
        if (isFieldOfficer) 'ordersGenerated':    int.tryParse(_counters['ordersGenerated']!.text) ?? 0,
        'callsMade':           int.tryParse(_counters['callsMade']!.text) ?? 0,
        'conversions':         int.tryParse(_counters['conversions']!.text) ?? 0,
        'opsIssuesSolved':     int.tryParse(_counters['opsIssuesSolved']!.text) ?? 0,
        'issuesFaced':  _issuesCtrl.text.trim(),
        'tomorrowPlan': _tomorrowCtrl.text.trim(),
        'additionalNotes': _notesCtrl.text.trim(),
      });
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Daily report submitted! +5 points 🎉'), backgroundColor: AppColors.secondary, behavior: SnackBarBehavior.floating));
      if (mounted) context.pop();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString().replaceAll('Exception: ', '')), backgroundColor: AppColors.danger, behavior: SnackBarBehavior.floating));
    } finally { if (mounted) setState(() => _saving = false); }
  }

  @override
  Widget build(BuildContext context) {
    final isFieldOfficer = ref.watch(authProvider).employee?.isFieldOfficer ?? false;

    if (_alreadySubmitted) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(title: const Text('Daily Report')),
        body: const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(Icons.check_circle_rounded, size: 72, color: AppColors.secondary),
          SizedBox(height: 16),
          Text('Report Already Submitted Today!', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          SizedBox(height: 8),
          Text('Come back tomorrow', style: TextStyle(color: AppColors.textSecondary)),
        ])),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: Text('Daily Report — ${DateFormat('d MMM').format(DateTime.now())}')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: AppColors.primaryLight, borderRadius: BorderRadius.circular(10)),
            child: const Row(children: [Icon(Icons.info_outline, color: AppColors.primary, size: 16), SizedBox(width: 8), Expanded(child: Text('Submit before 10 PM. Missing report = -5 points', style: TextStyle(fontSize: 12, color: AppColors.primary)))])),
          const SizedBox(height: 20),

          const Text('Today\'s Numbers', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          _CounterRow('Drivers Contacted', _counters['driversContacted']!),
          _CounterRow('Drivers Onboarded', _counters['driversOnboarded']!),
          if (isFieldOfficer) ...[
            _CounterRow('Retailers Visited', _counters['retailersVisited']!),
            _CounterRow('Retailers Onboarded', _counters['retailersOnboarded']!),
            _CounterRow('Orders Generated', _counters['ordersGenerated']!),
          ],
          _CounterRow('Calls Made', _counters['callsMade']!),
          _CounterRow('Conversions', _counters['conversions']!),
          _CounterRow('Ops Issues Solved', _counters['opsIssuesSolved']!),
          const SizedBox(height: 20),

          const Text('Summary', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          TextField(controller: _issuesCtrl, maxLines: 3, decoration: const InputDecoration(labelText: 'Issues Faced Today', hintText: 'Any problems encountered?')),
          const SizedBox(height: 12),
          TextField(controller: _tomorrowCtrl, maxLines: 2, decoration: const InputDecoration(labelText: 'Tomorrow\'s Plan', hintText: 'What\'s your plan for tomorrow?')),
          const SizedBox(height: 12),
          TextField(controller: _notesCtrl, maxLines: 2, decoration: const InputDecoration(labelText: 'Additional Notes', hintText: 'Anything else to report?')),
          const SizedBox(height: 24),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _saving ? null : _submit,
              style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
              child: _saving ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Submit Daily Report'),
            ),
          ),
          const SizedBox(height: 24),
        ]),
      ),
    );
  }
}

class _CounterRow extends StatelessWidget {
  final String label; final TextEditingController ctrl;
  const _CounterRow(this.label, this.ctrl);
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Expanded(child: Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500))),
          IconButton(icon: const Icon(Icons.remove_circle_outline, color: AppColors.danger, size: 22), onPressed: () {
            final v = int.tryParse(ctrl.text) ?? 0;
            if (v > 0) ctrl.text = '${v - 1}';
          }),
          SizedBox(width: 50, child: TextField(controller: ctrl, keyboardType: TextInputType.number, textAlign: TextAlign.center, decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 4, vertical: 8)))),
          IconButton(icon: const Icon(Icons.add_circle_outline, color: AppColors.primary, size: 22), onPressed: () {
            final v = int.tryParse(ctrl.text) ?? 0;
            ctrl.text = '${v + 1}';
          }),
        ],
      ),
    );
  }
}
