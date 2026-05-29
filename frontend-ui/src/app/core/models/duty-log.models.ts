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
  pilotId?: number | null;
  pilotName?: string | null;
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
  pilotId?: number | null;
}

export interface UserSummary {
  id: number;
  name: string;
  email: string;
  role: string;
}
