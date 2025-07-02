export interface ApiResponse<T = any> {
  message: string;
  status: 'success' | 'error';
  data?: T;
  type?: string;
}

export class ResponseDto {
  static success<T>(data?: T, message: string = '성공', type?: string): ApiResponse<T> {
    return {
      message,
      status: 'success',
      data,
      type
    };
  }

  static error(message: string = '실패', type?: string): ApiResponse {
    return {
      message,
      status: 'error',
      type
    };
  }
}
