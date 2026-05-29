import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:dio/dio.dart';
import '../../core/theme/app_theme.dart';
import '../../core/constants/app_constants.dart';
import '../../shared/providers/providers.dart';

class DriverFormScreen extends ConsumerStatefulWidget {
  const DriverFormScreen({ super.key });
  @override ConsumerState<DriverFormScreen> createState() => _DriverFormScreenState();
}

class _DriverFormScreenState extends ConsumerState<DriverFormScreen> {
  final _nameCtrl  = TextEditingController();
  final _phoneCtrl = TextEditingController();
  String _entryType    = 'new_onboarding';
  String _vehicleType  = '2-Wheeler Bike';
  String _paymentStatus = 'not_paid';
  final List<String> _selectedZones = [];
  int? _zoneId;
  File? _photo;
  bool _saving = false;
  Position? _position;

  @override
  void initState() {
    super.initState();
    _getLocation();
    _loadZones();
  }

  List<Map<String, dynamic>> _zones = [];
  Future<void> _loadZones() async {
    try {
      final res = await ref.read(dioProvider).get('/zones');
      setState(() => _zones = List<Map<String, dynamic>>.from(res.data['data']));
    } catch (_) {}
  }

  Future<void> _getLocation() async {
    final p = await LocationService.getOnce();
    if (mounted) setState(() => _position = p);
  }

  Future<void> _pickPhoto() async {
    final f = await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 70);
    if (f != null) setState(() => _photo = File(f.path));
  }

  Future<void> _submit() async {
    if (_nameCtrl.text.isEmpty || _phoneCtrl.text.isEmpty) {
      _snack('Driver name and phone are required', AppColors.danger); return;
    }
    setState(() => _saving = true);
    try {
      final data = FormData.fromMap({
        'entryType': _entryType,
        'driverName': _nameCtrl.text.trim(),
        'driverPhone': _phoneCtrl.text.trim(),
        'vehicleType': _vehicleType,
        'preferredZones': _selectedZones.join(','),
        'paymentStatus': _paymentStatus,
        if (_zoneId != null) 'zoneId': _zoneId,
        if (_position != null) 'lat': _position!.latitude,
        if (_position != null) 'lng': _position!.longitude,
        if (_photo != null) 'photo': await MultipartFile.fromFile(_photo!.path, filename: 'driver.jpg'),
      });
      await ref.read(dioProvider).post('/drivers', data: data);
      _snack('Driver entry submitted! Points awarded 🎉', AppColors.secondary);
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
  void dispose() { _nameCtrl.dispose(); _phoneCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Driver Entry')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Entry type
            Row(
              children: [
                _TypeChip('New Onboarding', 'new_onboarding', _entryType, (v) => setState(() => _entryType = v)),
                const SizedBox(width: 10),
                _TypeChip('Follow-up Visit', 'visit_followup', _entryType, (v) => setState(() => _entryType = v)),
              ],
            ),
            const SizedBox(height: 16),

            _Section('Driver Information'),
            TextField(controller: _nameCtrl, decoration: const InputDecoration(labelText: 'Driver Name *', prefixIcon: Icon(Icons.person_outline))),
            const SizedBox(height: 12),
            TextField(controller: _phoneCtrl, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Phone Number *', prefixIcon: Icon(Icons.phone_outlined))),
            const SizedBox(height: 12),

            const Text('Vehicle Type *', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              value: _vehicleType,
              decoration: const InputDecoration(prefixIcon: Icon(Icons.directions_car_outlined)),
              items: AppConstants.vehicleTypes.map((v) => DropdownMenuItem(value: v, child: Text(v))).toList(),
              onChanged: (v) => setState(() => _vehicleType = v!),
            ),
            const SizedBox(height: 16),

            _Section('Payment Status'),
            Row(
              children: [
                _TypeChip('Not Paid', 'not_paid', _paymentStatus, (v) => setState(() => _paymentStatus = v)),
                const SizedBox(width: 10),
                _TypeChip('Paid ✓', 'paid', _paymentStatus, (v) => setState(() => _paymentStatus = v)),
              ],
            ),
            const SizedBox(height: 16),

            _Section('Preferred Zones'),
            Wrap(
              spacing: 8, runSpacing: 6,
              children: _zones.map((z) {
                final selected = _selectedZones.contains(z['name']);
                return FilterChip(
                  label: Text(z['name']),
                  selected: selected,
                  onSelected: (v) => setState(() => v ? _selectedZones.add(z['name']) : _selectedZones.remove(z['name'])),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),

            _Section('Today\'s Zone (where you are now)'),
            DropdownButtonFormField<int?>(
              value: _zoneId,
              decoration: const InputDecoration(hintText: 'Select current zone', prefixIcon: Icon(Icons.location_on_outlined)),
              items: [const DropdownMenuItem<int?>(value: null, child: Text('Not specified')),
                ..._zones.map((z) => DropdownMenuItem<int?>(value: z['id'], child: Text(z['name'])))],
              onChanged: (v) => setState(() => _zoneId = v),
            ),
            const SizedBox(height: 16),

            _Section('Photo'),
            GestureDetector(
              onTap: _pickPhoto,
              child: Container(
                height: 120, width: double.infinity,
                decoration: BoxDecoration(
                  color: AppColors.surfaceVariant,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border, style: BorderStyle.solid),
                ),
                child: _photo != null
                  ? ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.file(_photo!, fit: BoxFit.cover))
                  : const Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      Icon(Icons.camera_alt_outlined, size: 32, color: AppColors.textTertiary),
                      SizedBox(height: 6),
                      Text('Take Photo', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                    ]),
              ),
            ),
            const SizedBox(height: 8),
            if (_position != null)
              Row(children: [
                const Icon(Icons.location_on, size: 14, color: AppColors.secondary),
                const SizedBox(width: 4),
                Text('Location captured', style: const TextStyle(fontSize: 12, color: AppColors.secondary)),
              ]),
            const SizedBox(height: 24),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _saving ? null : _submit,
                style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                child: _saving
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text(_entryType == 'new_onboarding' ? 'Submit New Driver Onboarding' : 'Submit Follow-up Visit'),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final String title;
  const _Section(this.title);
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
  );
}

class _TypeChip extends StatelessWidget {
  final String label, value, selected;
  final void Function(String) onTap;
  const _TypeChip(this.label, this.value, this.selected, this.onTap);
  @override
  Widget build(BuildContext context) => GestureDetector(
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
