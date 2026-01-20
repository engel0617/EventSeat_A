export enum TableShape {
  ROUND = 'ROUND',
  RECTANGLE = 'RECTANGLE'
}

export interface Seat {
  id: string; // usually `${tableId}-${index}`
  index: number;
  guestId: string | null;
}

export interface Table {
  id: string;
  label: string;
  x: number;
  y: number;
  shape: TableShape;
  seats: Seat[];
  width?: number; // For rectangle
  height?: number; // For rectangle
  radius?: number; // For round
  rotation?: number; // Rotation in degrees
}

export type RsvpStatus = 'confirmed' | 'pending' | 'declined';

export interface Guest {
  id: string;
  name: string;
  category: string; // e.g., 'Bride Family', 'Groom Friend'
  tags: string[]; // e.g., 'Veggie', 'Child', 'VIP'
  rsvpStatus: RsvpStatus;
  relationships: string[]; // e.g., 'Must sit with X', 'Avoid Y'
  notes?: string;
  assignedSeatId: string | null;
}

export type GuestGroup = 'Family' | 'Friend' | 'Colleague' | 'VIP' | 'Other';

export interface AppState {
  tables: Table[];
  guests: Guest[];
  selectedGuestId: string | null;
  isDragging: boolean;
}