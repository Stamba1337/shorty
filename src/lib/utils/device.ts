export type Device = 'mobile' | 'tablet' | 'desktop';

export function detectDevice(ua: string): Device {
  if (/tablet|ipad|playbook|silk|(android(?!.*mobi))/i.test(ua)) return 'tablet';
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
}
