class AppConstants {
  AppConstants._();

  // API — set via --dart-define at build time
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://movigoinnovations.com/app/api/v1',
  );
  static const String socketUrl = String.fromEnvironment(
    'SOCKET_URL',
    defaultValue: 'https://movigoinnovations.com/app',
  );

  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);

  // Hive box keys
  static const String employeeBox   = 'employee_box';
  static const String configBox     = 'config_box';
  static const String offlineBox    = 'offline_box';
  static const String locationBox   = 'location_box';

  // Secure storage keys
  static const String accessTokenKey  = 'access_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String employeeIdKey   = 'employee_id';

  // Location
  static const int locationIntervalSeconds = 60;
  static const int locationBatchSize       = 20;
  static const double minDistanceMeters   = 10.0;

  // Vehicle types (matches form)
  static const List<String> vehicleTypes = [
    '2-Wheeler Bike',
    '2-Wheeler Scooter',
    '3-Wheeler Passenger',
    'E-Loader',
    '3-Wheeler Diesel',
    'Tata Ace',
    'Pickup',
    'Other',
  ];

  // Call outcomes
  static const List<String> callOutcomes = [
    'interested',
    'not_interested',
    'callback',
    'converted',
    'no_answer',
    'busy',
  ];
}
