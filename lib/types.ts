export interface Position {
  line: number;
  char: number;
}

export interface Range {
  start: Position;
  end: Position;
}
