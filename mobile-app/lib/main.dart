import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'core/theme/app_theme.dart';
import 'app_router.dart';
import 'shared/providers/providers.dart';

final FlutterLocalNotificationsPlugin _localNotif = FlutterLocalNotificationsPlugin();

@pragma('vm:entry-point')
Future<void> _fcmBackgroundHandler(RemoteMessage msg) async {
  await Firebase.initializeApp();
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp, DeviceOrientation.portraitDown]);
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(statusBarColor: Colors.transparent, statusBarIconBrightness: Brightness.dark));

  // Hive
  await Hive.initFlutter();

  // Firebase (gracefully fail if google-services.json not present)
  try {
    await Firebase.initializeApp();
    FirebaseMessaging.onBackgroundMessage(_fcmBackgroundHandler);

    // Local notification channel
    const androidChannel = AndroidNotificationChannel('movigo_main', 'Movigo Notifications', importance: Importance.high);
    await _localNotif.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()?.createNotificationChannel(androidChannel);

    await _localNotif.initialize(
      const InitializationSettings(android: AndroidInitializationSettings('@mipmap/ic_launcher')),
    );

    // Handle FCM foreground
    FirebaseMessaging.onMessage.listen((msg) {
      if (msg.notification != null) {
        _localNotif.show(
          msg.hashCode,
          msg.notification!.title,
          msg.notification!.body,
          NotificationDetails(android: AndroidNotificationDetails('movigo_main', 'Movigo Notifications',
            importance: Importance.high, priority: Priority.high, icon: '@mipmap/ic_launcher')),
        );
      }
    });
  } catch (_) {
    // Firebase not configured — push notifications won't work but app still runs
  }

  runApp(const ProviderScope(child: MovigoApp()));
}

class MovigoApp extends ConsumerWidget {
  const MovigoApp({ super.key });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    final config = ref.watch(authProvider).config;

    return MaterialApp.router(
      title: 'Movigo FieldOps',
      theme: AppTheme.light,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
      builder: (ctx, child) {
        // Maintenance mode overlay
        if (config?.isMaintenanceMode == true) {
          return _MaintenanceScreen(msg: config!.maintenanceMsg);
        }
        // Force update
        if (config?.forceUpdate == true) {
          return _ForceUpdateScreen();
        }
        return child ?? const SizedBox();
      },
    );
  }
}

class _MaintenanceScreen extends StatelessWidget {
  final String msg;
  const _MaintenanceScreen({ required this.msg });
  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.background,
    body: Center(child: Padding(padding: const EdgeInsets.all(32),
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Container(width: 72, height: 72, decoration: BoxDecoration(color: AppColors.warningLight, borderRadius: BorderRadius.circular(20)),
          child: const Icon(Icons.construction_rounded, size: 40, color: AppColors.warning)),
        const SizedBox(height: 24),
        const Text('Under Maintenance', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
        const SizedBox(height: 10),
        Text(msg, textAlign: TextAlign.center, style: const TextStyle(fontSize: 14, color: AppColors.textSecondary)),
      ]),
    )),
  );
}

class _ForceUpdateScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.background,
    body: Center(child: Padding(padding: const EdgeInsets.all(32),
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Container(width: 72, height: 72, decoration: BoxDecoration(color: AppColors.primaryLight, borderRadius: BorderRadius.circular(20)),
          child: const Icon(Icons.system_update_rounded, size: 40, color: AppColors.primary)),
        const SizedBox(height: 24),
        const Text('Update Required', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
        const SizedBox(height: 10),
        const Text('A new version is available.\nPlease update the app to continue.', textAlign: TextAlign.center, style: TextStyle(fontSize: 14, color: AppColors.textSecondary)),
        const SizedBox(height: 24),
        ElevatedButton(onPressed: () {}, child: const Text('Update Now')),
      ]),
    )),
  );
}
