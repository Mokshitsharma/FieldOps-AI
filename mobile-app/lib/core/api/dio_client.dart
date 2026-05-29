import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:logger/logger.dart';
import '../constants/app_constants.dart';

final _log = Logger();
const _storage = FlutterSecureStorage();

Dio createDio() {
  final dio = Dio(BaseOptions(
    baseUrl: AppConstants.baseUrl,
    connectTimeout: AppConstants.connectTimeout,
    receiveTimeout: AppConstants.receiveTimeout,
    headers: {'Content-Type': 'application/json'},
  ));
  dio.interceptors.add(_AuthInterceptor(dio));
  return dio;
}

class _AuthInterceptor extends Interceptor {
  final Dio _dio;
  bool _refreshing = false;

  _AuthInterceptor(this._dio);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await _storage.read(key: AppConstants.accessTokenKey);
    if (token != null) options.headers['Authorization'] = 'Bearer $token';
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401 && !_refreshing) {
      _refreshing = true;
      try {
        final refresh = await _storage.read(key: AppConstants.refreshTokenKey);
        if (refresh == null) { _refreshing = false; handler.next(err); return; }

        final res = await _dio.post('/auth/refresh',
          data: {'refreshToken': refresh, 'userType': 'employee'},
          options: Options(headers: {'Authorization': null}),
        );
        final newAccess  = res.data['data']['accessToken'];
        final newRefresh = res.data['data']['refreshToken'];
        await _storage.write(key: AppConstants.accessTokenKey,  value: newAccess);
        await _storage.write(key: AppConstants.refreshTokenKey, value: newRefresh);

        final opts = err.requestOptions;
        opts.headers['Authorization'] = 'Bearer $newAccess';
        final retry = await _dio.fetch(opts);
        _refreshing = false;
        handler.resolve(retry);
      } catch (_) {
        _refreshing = false;
        await _storage.deleteAll();
        handler.next(err);
      }
    } else {
      handler.next(err);
    }
  }
}

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  const ApiException(this.message, [this.statusCode]);
  @override String toString() => message;

  static ApiException from(DioException e) =>
    ApiException(e.response?.data?['message'] ?? e.message ?? 'Network error', e.response?.statusCode);
}
