// Thời gian là dependency ngoài (không deterministic) nên bọc lại để test được.
export abstract class Clock {
  abstract now(): Date;
}
