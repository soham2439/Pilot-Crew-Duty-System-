export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface DutyLog {
  id: number;
  dutyCode: 'FDUT' | 'DOFF' | 'VAC' | 'SICK' | 'AVBL' | string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  aircraftType: string;
  remarks: string;
}

export interface DutyLogPayload {
  dutyCode: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  aircraftType: string;
  remarks: string;
}
