import { createHmac } from 'node:crypto';

// HMAC-SHA256 của recipient đã normalize — dùng để filter admin mà không lộ email/phone thô.
export function hashRecipient(recipient: string, secret: string): string {
  return createHmac('sha256', secret).update(recipient.trim().toLowerCase()).digest('hex');
}

// Mask recipient cho hiển thị: email -> ng***@gmail.com, phone -> ****1234.
export function maskRecipient(recipient: string): string {
  if (recipient.includes('@')) {
    const at = recipient.indexOf('@');
    const local = recipient.slice(0, at);
    const domain = recipient.slice(at);
    const head = local.slice(0, Math.min(2, local.length));
    return `${head}***${domain}`;
  }
  return `****${recipient.slice(-4)}`;
}
