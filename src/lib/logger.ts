export const logger = {
  info: (msg: string, data?: unknown) =>
    console.log(JSON.stringify({ level: 'INFO', msg, data, ts: new Date().toISOString() })),
  warn: (msg: string, data?: unknown) =>
    console.warn(JSON.stringify({ level: 'WARN', msg, data, ts: new Date().toISOString() })),
  error: (msg: string, data?: unknown) =>
    console.error(JSON.stringify({ level: 'ERROR', msg, data, ts: new Date().toISOString() })),
};
