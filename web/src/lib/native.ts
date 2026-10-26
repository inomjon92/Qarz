import { Capacitor, registerPlugin } from "@capacitor/core";

export interface GatewayStatus {
  enabled: boolean;
  permission: boolean;
  lastRun: number | null;
  lastError: string | null;
  sentTotal: number;
}

// Native Android plugin (android/.../SmsGatewayPlugin.java): sends queued SMS through the phone's SIM
// from a background WorkManager job, even when the app is closed.
interface SmsGatewayPlugin {
  enable(opts: { apiBase: string; token: string }): Promise<GatewayStatus>;
  disable(): Promise<GatewayStatus>;
  status(): Promise<GatewayStatus>;
  requestPermission(): Promise<{ granted: boolean }>;
  runNow(): Promise<GatewayStatus>;
}

export const SmsGateway = registerPlugin<SmsGatewayPlugin>("SmsGateway");

export const isNative = () => Capacitor.isNativePlatform();
