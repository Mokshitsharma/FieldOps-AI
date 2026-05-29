import 'dart:async';
import 'package:dio/dio.dart';
import 'package:geolocator/geolocator.dart';
import 'package:battery_plus/battery_plus.dart';
import 'package:logger/logger.dart';

final _log = Logger();
final _battery = Battery();

class LocationService {
  static StreamSubscription<Position>? _sub;
  static Timer? _uploadTimer;
  static final List<Map<String, dynamic>> _buffer = [];
  static bool _tracking = false;
  static int? _activeZoneId;

  static bool get isTracking => _tracking;

  static Future<bool> requestPermissions() async {
    if (!await Geolocator.isLocationServiceEnabled()) return false;
    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
    return perm != LocationPermission.denied && perm != LocationPermission.deniedForever;
  }

  static Future<Position?> getOnce() async {
    if (!await requestPermissions()) return null;
    try {
      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 15),
      );
    } catch (_) { return null; }
  }

  static Future<void> startTracking({ required Dio dio, required int employeeId, int? zoneId, int intervalSeconds = 60 }) async {
    if (_tracking) return;
    if (!await requestPermissions()) return;

    _tracking = true;
    _activeZoneId = zoneId;

    _sub = Geolocator.getPositionStream(
      locationSettings: AndroidSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
        intervalDuration: Duration(seconds: intervalSeconds),
        foregroundNotificationConfig: const ForegroundNotificationConfig(
          notificationTitle: 'Movigo FieldOps',
          notificationText: 'Location tracking active',
          enableWakeLock: true,
        ),
      ),
    ).listen(
      (pos) => _onPosition(pos),
      onError: (_) => _buffer.add({ 'lat': 0, 'lng': 0, 'isGpsOff': true, 'timestamp': DateTime.now().toIso8601String() }),
    );

    // Upload buffer every minute
    _uploadTimer = Timer.periodic(const Duration(seconds: 60), (_) => _flush(dio, employeeId));
  }

  static Future<void> stopTracking(Dio dio, int employeeId) async {
    _tracking = false;
    _activeZoneId = null;
    await _sub?.cancel();
    _sub = null;
    _uploadTimer?.cancel();
    _uploadTimer = null;
    await _flush(dio, employeeId);
  }

  static Future<void> _onPosition(Position pos) async {
    int? bat;
    try { bat = await _battery.batteryLevel; } catch (_) {}

    _buffer.add({
      'lat': pos.latitude,
      'lng': pos.longitude,
      'accuracy': pos.accuracy,
      'speed': pos.speed,
      if (bat != null) 'battery': bat.toDouble(),
      'isGpsOff': false,
      'timestamp': DateTime.now().toIso8601String(),
    });

    // Keep buffer under 100
    if (_buffer.length > 100) _buffer.removeAt(0);
  }

  static Future<void> _flush(Dio dio, int employeeId) async {
    if (_buffer.isEmpty) return;
    final batch = List<Map<String, dynamic>>.from(_buffer);
    _buffer.clear();
    try {
      await dio.post('/location/batch', data: {
        'locations': batch,
        if (_activeZoneId != null) 'zoneId': _activeZoneId,
      });
    } catch (_) {
      // Put back in buffer if failed
      _buffer.insertAll(0, batch);
      _log.w('Location upload failed — ${batch.length} points kept in buffer');
    }
  }
}
