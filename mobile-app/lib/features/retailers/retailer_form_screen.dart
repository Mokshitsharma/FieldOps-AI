import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:dio/dio.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/providers/providers.dart';
import '../location/location_service.dart';
import 'package:geolocator/geolocator.dart';

class RetailerFormScreen extends ConsumerStatefulWidget {
  const RetailerFormScreen({ super.key });
  @override ConsumerState<RetailerFormScreen> createState() => _RetailerFormScreenState();
}

class _RetailerFormScreenState extends ConsumerState<RetailerFormScreen> {
  final _nameCtrl     = TextEditingController();
  final _phoneCtrl    = TextEditingController();
  final _locationCtrl = TextEditingController();
  final _orderCtrl    = TextEditingController();
  String _entryType = 'new_onboarding';
  String _minOrders = '1-2';
  int? _zoneId;
  File? _photo;
  bool _saving = false;
  Position? _position;
  List<Map<String, dynamic>> _zones = [];

  @override
  void initState() {
    super.initState();
    LocationService.getOnce().then((p) { if (mounted) setState(() => _position = p); });
    ref.read(dioProvider).get('/zones').then((res) {
      if (mounted) setState(() => _zones = List<Map<String, dynamic>>.from(res.data['data']));
    }).catchError((_) {});
  }

  @override
  void dispose() { _nameCtrl.dispose(); _phoneCtrl.dispose(); _locationCtrl.dispose(); _orderCtrl.dispose(); super.dispose(); }

  Future<void> _submit() async {
    if (_nameCtrl.text.isEmpty || _locationCtrl.text.isEmpty) {
      _snack('Retailer name and shop location are required', AppColors.danger); return;
    }
    setState(() => _saving = true);
    try {
      final data = FormData.fromMap({
        'entryType': _entryType,
        'retailerName': _nameCtrl.text.trim(),
        'retailerPhone': _phoneCtrl.text.trim(),
        'shopLocation': _locationCtrl.text.trim(),
        'minOrdersPerDay': _minOrders,
        if (_orderCtrl.text.isNotEmpty) 'orderDetails': _orderCtrl.text.trim(),
        if (_zoneId != null) 'zoneId': _zoneId,
        if (_position != null) 'lat': _position!.latitude,
        if (_position != null) 'lng': _position!.longitude,
        if (_photo != null) 'photo': await MultipartFile.fromFile(_photo!.path, filename: 'retailer.jpg'),
      });
      await ref.read(dioProvider).post('/retailers', data: data);
      _snack('Retailer entry submitted! Points awarded 🎉', AppColors.secondary);
      if (mounted) context.pop();
    } catch (e) {
      _snack(e.toString().replaceAll('Exception: ', ''), AppColors.danger);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _snack(String msg, Color c) => ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(msg), backgroundColor: c, behavior: SnackBarBehavior.floating));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Retailer Entry')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Entry type
            Row(children: [
              _Chip('New Onboarding',   'new_onboarding',   _entryType, (v) => setState(() => _entryType = v)),
              const SizedBox(width: 8),
              _Chip('Follow-up Visit', 'visit_followup',  _entryType, (v) => setState(() => _entryType = v)),
              const SizedBox(width: 8),
              _Chip('Order Generated', 'order_generated', _entryType, (v) => setState(() => _entryType = v)),
            ]),
            const SizedBox(height: 16),

            _Lbl('Retailer Name *'),
            TextField(controller: _nameCtrl, decoration: const InputDecoration(hintText: 'Shop / business name', prefixIcon: Icon(Icons.store_outlined))),
            const SizedBox(height: 12),

            _Lbl('Phone Number'),
            TextField(controller: _phoneCtrl, keyboardType: TextInputType.phone, decoration: const InputDecoration(hintText: 'Optional', prefixIcon: Icon(Icons.phone_outlined))),
            const SizedBox(height: 12),

            _Lbl('Shop Location / Address *'),
            TextField(controller: _locationCtrl, decoration: const InputDecoration(hintText: 'Full shop address', prefixIcon: Icon(Icons.location_on_outlined))),
            const SizedBox(height: 12),

            _Lbl('Min Orders per Day'),
            DropdownButtonFormField<String>(
              value: _minOrders,
              decoration: const InputDecoration(prefixIcon: Icon(Icons.shopping_bag_outlined)),
              items: ['1-2', '2-5', '5-10', '10+'].map((v) => DropdownMenuItem(value: v, child: Text(v))).toList(),
              onChanged: (v) => setState(() => _minOrders = v!),
            ),
            const SizedBox(height: 12),

            if (_entryType == 'order_generated') ...[
              _Lbl('Order Details'),
              TextField(controller: _orderCtrl, maxLines: 2, decoration: const InputDecoration(hintText: 'What was ordered?')),
              const SizedBox(height: 12),
            ],

            _Lbl('Zone'),
            DropdownButtonFormField<int?>(
              value: _zoneId,
              decoration: const InputDecoration(hintText: 'Select zone', prefixIcon: Icon(Icons.map_outlined)),
              items: [const DropdownMenuItem<int?>(value: null, child: Text('Not specified')),
                ..._zones.map((z) => DropdownMenuItem<int?>(value: z['id'] as int, child: Text(z['name'])))],
              onChanged: (v) => setState(() => _zoneId = v),
            ),
            const SizedBox(height: 16),

            _Lbl('Shop Photo *'),
            GestureDetector(
              onTap: () async {
                final f = await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 70);
                if (f != null && mounted) setState(() => _photo = File(f.path));
              },
              child: Container(
                height: 130, width: double.infinity,
                decoration: BoxDecoration(
                  color: AppColors.surfaceVariant, borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: _photo == null ? AppColors.danger.withOpacity(0.5) : AppColors.border),
                ),
                child: _photo != null
                  ? ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.file(_photo!, fit: BoxFit.cover))
                  : const Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      Icon(Icons.camera_alt_outlined, size: 32, color: AppColors.textTertiary),
                      SizedBox(height: 6),
                      Text('Take shop photo (required)', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                    ]),
              ),
            ),
            if (_position != null) ...[
              const SizedBox(height: 6),
              Row(children: [
                const Icon(Icons.location_on, size: 13, color: AppColors.secondary),
                const SizedBox(width: 3),
                const Text('GPS location captured', style: TextStyle(fontSize: 11, color: AppColors.secondary)),
              ]),
            ],
            const SizedBox(height: 24),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _saving ? null : _submit,
                style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                child: _saving
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text({
                      'new_onboarding':  'Submit New Retailer',
                      'visit_followup':  'Submit Follow-up Visit',
                      'order_generated': 'Submit Order Generated',
                    }[_entryType] ?? 'Submit'),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

class _Lbl extends StatelessWidget {
  final String t;
  const _Lbl(this.t);
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: Text(t, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
  );
}

class _Chip extends StatelessWidget {
  final String label, value, selected;
  final void Function(String) onTap;
  const _Chip(this.label, this.value, this.selected, this.onTap);
  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: () => onTap(value),
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: selected == value ? AppColors.primaryLight : AppColors.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: selected == value ? AppColors.primary : AppColors.border),
      ),
      child: Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: selected == value ? AppColors.primary : AppColors.textSecondary)),
    ),
  );
}
