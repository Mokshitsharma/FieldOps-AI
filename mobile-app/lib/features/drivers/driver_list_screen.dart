import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/providers/providers.dart';

// ════════════════════════════════════════════════════════════════
// DRIVER LIST
// ════════════════════════════════════════════════════════════════
class DriverListScreen extends ConsumerStatefulWidget {
  const DriverListScreen({ super.key });
  @override ConsumerState<DriverListScreen> createState() => _DriverListState();
}

class _DriverListState extends ConsumerState<DriverListScreen> {
  List<dynamic> _items = [];
  bool _loading = true;
  String _filter = '';

  @override
  void initState() { super.initState(); _fetch(); }

  Future<void> _fetch() async {
    setState(() => _loading = true);
    try {
      final res = await ref.read(dioProvider).get('/drivers/my', queryParameters: { 'limit': 50, if (_filter.isNotEmpty) 'entryType': _filter });
      setState(() => _items = res.data['data'] ?? []);
    } catch (_) {} finally { if (mounted) setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('My Drivers')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/drivers/new').then((_) => _fetch()),
        icon: const Icon(Icons.add),
        label: const Text('New Entry'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          // Filter chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Row(
              children: [
                {'label': 'All', 'value': ''},
                {'label': 'New Onboarding', 'value': 'new_onboarding'},
                {'label': 'Follow-up', 'value': 'visit_followup'},
              ].map((f) => Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(f['label']!),
                  selected: _filter == f['value'],
                  onSelected: (_) { setState(() => _filter = f['value']!); _fetch(); },
                ),
              )).toList(),
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _items.isEmpty
                ? _EmptyState('No driver entries yet', 'Tap + to add your first driver')
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _items.length,
                    itemBuilder: (ctx, i) {
                      final d = _items[i];
                      return _DriverCard(driver: d);
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class _DriverCard extends StatelessWidget {
  final Map<String, dynamic> driver;
  const _DriverCard({ required this.driver });
  @override
  Widget build(BuildContext context) {
    final isNew = driver['entryType'] == 'new_onboarding';
    final isPaid = driver['paymentStatus'] == 'paid';
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.border)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(radius: 18, backgroundColor: AppColors.primaryLight, child: Text(driver['driverName'][0].toUpperCase(), style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700))),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(driver['driverName'], style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                    Text(driver['driverPhone'], style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontFamily: 'monospace')),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isNew ? AppColors.primaryLight : AppColors.surfaceVariant,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(isNew ? 'New' : 'Follow-up', style: TextStyle(fontSize: 11, color: isNew ? AppColors.primary : AppColors.textSecondary, fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              _Tag(Icons.directions_car, driver['vehicleType'] ?? ''),
              const SizedBox(width: 8),
              _Tag(
                isPaid ? Icons.check_circle : Icons.cancel,
                isPaid ? 'Paid' : 'Not Paid',
                color: isPaid ? AppColors.secondary : AppColors.danger,
              ),
              const Spacer(),
              Text(
                driver['createdAt'] != null ? DateFormat('d MMM, HH:mm').format(DateTime.parse(driver['createdAt'])) : '',
                style: const TextStyle(fontSize: 11, color: AppColors.textTertiary),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  final IconData icon; final String label; final Color? color;
  const _Tag(this.icon, this.label, { this.color });
  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(icon, size: 13, color: color ?? AppColors.textSecondary),
      const SizedBox(width: 3),
      Text(label, style: TextStyle(fontSize: 11, color: color ?? AppColors.textSecondary)),
    ],
  );
}

class _EmptyState extends StatelessWidget {
  final String title, subtitle;
  const _EmptyState(this.title, this.subtitle);
  @override
  Widget build(BuildContext context) => Center(
    child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Icon(Icons.inbox_outlined, size: 60, color: AppColors.textTertiary),
        const SizedBox(height: 12),
        Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
        const SizedBox(height: 4),
        Text(subtitle, style: const TextStyle(fontSize: 13, color: AppColors.textTertiary)),
      ],
    ),
  );
}
