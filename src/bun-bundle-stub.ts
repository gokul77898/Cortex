export function feature(name: string): boolean {
  const flags: Record<string, boolean> = {
    BUDDY: true,
  };
  return flags[name] ?? false;
}
