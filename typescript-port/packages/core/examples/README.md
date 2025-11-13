# WebRTC P2P Demo Examples

This directory contains working demos of real WebRTC peer-to-peer connections using the Osvauld TypeScript port.

## 🎯 Current Status

- ✅ **Real WebRTC connections** using simple-peer library
- ✅ **Manual signaling** via copy/paste (no signaling server needed)
- ✅ **Same-device, different browser tabs** - **FULLY WORKING** ✨
- ✅ **Trickle ICE disabled** - All connection info in single offer/answer exchange
- ✅ **STUN servers configured** - Google's public STUN servers for NAT traversal
- ✅ **iOS-compatible copy/paste** - Fallback mechanisms for mobile Safari
- ⏳ **Cross-device testing** - In progress

## 📁 Demo Files

### 1. `simple-demo.html` ⭐ **RECOMMENDED - FULLY WORKING**
**Version**: v1.3 (iOS copy fix)
**Status**: ✅ **Working across browser tabs**

Clean, step-by-step demo for establishing P2P connections between two browser tabs.

**How to use**:
1. Start the server: `npx http-server -p 3456 -c-1 --cors`
2. Open `http://localhost:3456/examples/simple-demo.html` in **two tabs**
3. **Tab A**: Click "Tab A - Create Connection" → "Create Connection Code"
4. Copy the code and paste it in **Tab B**
5. **Tab B**: Click "Tab B - Join Connection" → Paste code → "Accept Connection"
6. Copy the answer code from Tab B
7. **Tab A**: Paste answer code → "Complete Connection"
8. 🎉 **Connected!** Send messages between tabs

**Features**:
- Clear step-by-step UI
- Detailed console logging (v1.3)
- Copy/paste tracking
- Tap-to-select textareas for mobile
- iOS clipboard fallback
- Connection status display
- Real-time messaging

### 2. `qr-browser-demo.html`
**Version**: v1.0 (Trickle ICE disabled + iOS copy fix)
**Status**: ⚠️ In progress (cross-device testing)

Demo with QR code generation for easier mobile device pairing.

**How to use**:
1. Start the server: `npx http-server -p 3456 -c-1 --cors`
2. Find your IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`
3. Open on computer: `http://YOUR_IP:3456/examples/qr-browser-demo.html`
4. Open on phone: `http://YOUR_IP:3456/examples/qr-browser-demo.html`
5. Follow the on-screen instructions

**Features**:
- QR code generation for easy sharing
- iOS-compatible copy with execCommand fallback
- Tap-to-select share codes
- Visual connection status
- Detailed console logging

### 3. `auto-test.html`
**Status**: ✅ Working (single-page test only)

Automated test that connects two peers on the same page. Useful for testing signal exchange logic but **NOT** a real WebRTC cross-device test.

**How to use**:
1. Open `http://localhost:3456/examples/auto-test.html`
2. Click "Run Test"
3. Watch the console for connection progress

**Note**: This only tests signal exchange within a single browser tab, not real P2P across devices.

## 🚀 Quick Start

### Prerequisites
```bash
cd typescript-port/packages/core
npm install
npm run build
```

### Build Browser Bundle
```bash
npx esbuild examples/browser-bundle.ts \
  --bundle \
  --format=esm \
  --outfile=examples/bundle.js \
  --define:global=globalThis
```

### Start Development Server
```bash
npx http-server -p 3456 -c-1 --cors
```

Then open `http://localhost:3456/examples/simple-demo.html` in **two separate browser tabs**.

## 🔧 Technical Details

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  WebRTC Connection Flow                  │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Tab A (Initiator)              Tab B (Responder)        │
│  ┌──────────────┐               ┌──────────────┐        │
│  │              │               │              │        │
│  │  Create Peer │               │              │        │
│  │  trickle:    │               │              │        │
│  │    false  ← KEY!             │              │        │
│  │              │               │              │        │
│  │  connect()   │               │              │        │
│  │      ↓       │               │              │        │
│  │  'signal'    │               │              │        │
│  │   event      │               │              │        │
│  │      ↓       │               │              │        │
│  │  Offer SDP + │  ─────────→   │              │        │
│  │  ICE (796ch) │  (copy/paste) │  Create Peer │        │
│  │              │               │  trickle:    │        │
│  │              │               │    false  ← KEY!      │
│  │              │               │      ↓       │        │
│  │              │               │  connect()   │        │
│  │              │               │      ↓       │        │
│  │              │               │  signal(offer)│       │
│  │              │               │      ↓       │        │
│  │              │               │  'signal'    │        │
│  │              │  ←─────────   │   event      │        │
│  │  signal(ans) │  (copy/paste) │      ↓       │        │
│  │      ↓       │               │  Answer SDP +│        │
│  │  'connect'   │  ←─────────→  │  ICE (796ch) │        │
│  │   event!     │   P2P Data    │      ↓       │        │
│  │              │   Channel     │  'connect'   │        │
│  │              │               │   event!     │        │
│  └──────────────┘               └──────────────┘        │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Key Configuration: Trickle ICE Disabled ⚠️

**Critical for manual signaling:**

```typescript
createInitiator({
  peerId: 'peer-id',
  trickle: false  // ← MUST BE FALSE for copy/paste signaling!
})
```

**Why?**

With `trickle: true` (default), WebRTC sends:
1. Initial offer/answer (SDP)
2. Multiple separate ICE candidate signals (as they're discovered)

With manual copy/paste, we can only do **one exchange** in each direction. Setting `trickle: false` bundles **all ICE candidates into the initial offer/answer**, making single-exchange signaling possible.

### STUN Servers

```typescript
const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];
```

Located in: `src/p2p/webrtc-peer.ts:48-52`

These public STUN servers help peers discover their public IP addresses for NAT traversal.

### Signal Exchange Format

**Share Code Structure**:
```typescript
interface ShareCode {
  version: 1;
  peerId: string;
  signal: SimplePeer.SignalData;  // SDP + ALL ICE candidates
  timestamp: number;
}
```

- Encoded as Base64
- Typically ~796 characters
- Contains offer/answer SDP and all ICE candidates

## 📊 Testing Status

| Test Scenario | Status | Notes |
|--------------|--------|-------|
| Same browser, different tabs | ✅ **WORKING** | Fully tested and confirmed (v1.3) |
| Same device, different browsers | ⏳ Pending | Should work (uses WebRTC) |
| Different devices, same WiFi | ⏳ Testing | STUN configured, needs validation |
| Different devices, different networks | ⏳ Pending | May need TURN servers for some NAT types |

## 🐛 Known Issues

1. **iOS clipboard API restrictions** - ✅ Fixed with `execCommand('copy')` fallback
2. **Connection timeout during handshake** - Expected behavior (signals still processing), not an error
3. **30-second timeout** - Must complete handshake within 30s or connection fails
4. **Cross-device mobile** - In testing, may have additional iOS restrictions

## 📝 Version History

### v1.3 - simple-demo.html (Current) ✅
- Fixed signal generation order (connect() before waiting for signal)
- Added `trickle: false` for single-exchange signaling
- iOS copy/paste improvements with fallback
- Tap-to-select textareas
- Copy/paste tracking in console logs
- **Status**: Fully working for same-browser, different-tabs testing

### v1.0 - qr-browser-demo.html (Current)
- Added `trickle: false` configuration
- iOS-compatible copy with execCommand fallback
- QR code generation for mobile devices
- Tap-to-select share codes with visual feedback
- **Status**: Testing cross-device connections

### v1.0 - auto-test.html
- Single-page automated test
- Continuous signal forwarding
- Good for testing signal exchange logic
- **Not** a real cross-device test

## 💡 Tips for Mobile Testing

### 🚨 **CRITICAL: Use IP Address, NOT localhost!**

**❌ WRONG (will fail cross-device):**
```
http://localhost:3456/examples/chat.html
```

**✅ CORRECT (will work cross-device):**
```
http://192.168.1.127:3456/examples/chat.html
```

**Why?** When you access via `localhost`, browsers **do NOT generate local network ICE candidates**. You'll only get public IP candidates from STUN, which can't reach devices on the same WiFi network. This causes "Connection failed" errors.

**Find your computer's IP address**:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
# Example output: inet 192.168.1.127
```

**On your computer AND phone**:
1. **BOTH must connect to same WiFi network**
2. **Computer**: Open `http://192.168.1.127:3456/examples/chat.html` (use YOUR IP)
3. **Phone**: Open same URL `http://192.168.1.127:3456/examples/chat.html`
4. Complete the connection flow

**iOS Copy Workaround**:
- Tap the textarea to auto-select text
- Use iOS "Copy" from context menu
- Or use the "Copy" button (has fallback)
- **Turn OFF VPN** on both devices during connection setup

## 🔗 Related Files

- `src/p2p/webrtc-peer.ts` - Real WebRTC peer implementation
- `src/p2p/signaling.ts` - QR code and share code utilities
- `examples/browser-bundle.ts` - Browser entry point
- `examples/polyfills.js` - Node.js polyfills for browser (Buffer, process, global)
- `examples/bundle.js` - Compiled browser bundle (~293KB)

## 🐞 Debugging

**Check the browser console** - Each demo logs:
- Version number on load
- Each step of the connection flow
- Signal generation events
- Copy/paste actions (v1.3+)
- Connection success/failure

**Common log patterns**:

**Success**:
```
🔗 WebRTC Two-Tab Demo v1.3
📱 Selected: Initiator (Tab A)
📡 Creating initiator peer...
📡 Offer signal received!
✅ Connection code generated (796 chars)
📋 Copied offer code to clipboard
...
🎉 CONNECTED!
```

**What connection timeout means**:
```
❌ Connection timeout  ← This is NORMAL during handshake!
```
The `connect()` promise times out after 30s, but the connection can still complete via the 'connect' event if signals are exchanged properly.

## 📖 Next Steps (Phase 12 Completion)

- [x] Real WebRTC peer implementation
- [x] Browser bundle with polyfills
- [x] Manual signaling system (copy/paste)
- [x] Trickle ICE configuration
- [x] Same-browser tab testing
- [ ] Cross-device testing (same WiFi) - **IN PROGRESS**
- [ ] Cross-network testing (internet)
- [ ] TURN server integration (for restrictive NATs)
- [ ] Performance benchmarking (Phase 13)
- [ ] Documentation & polish (Phase 14)

## API Examples

### Basic Connection Flow

```typescript
import { createInitiator, createResponder } from '../src/p2p/webrtc-peer';
import { generateShareCode, parseShareCode } from '../src/p2p/signaling';

// === INITIATOR (Machine A) ===
const initiator = createInitiator({
  peerId: 'peer-a',
  trickle: false  // ← IMPORTANT!
});

// Wait for signal (contains offer + ICE)
initiator.on('signal', (signal) => {
  const shareCode = generateShareCode(initiator.id, signal);
  console.log('Share this code:', shareCode);
  // User copies this to Machine B
});

// Start connection (triggers signal generation)
await initiator.connect();

// Later, when answer is received:
function receiveAnswer(answerCode: string) {
  const { signal } = parseShareCode(answerCode);
  initiator.signal(signal);
}

// Connection established
initiator.on('connect', () => {
  console.log('🎉 Connected!');
});

// === RESPONDER (Machine B) ===
function handleOffer(offerCode: string) {
  const { peerId, signal: offerSignal } = parseShareCode(offerCode);

  const responder = createResponder({
    peerId: 'peer-b',
    trickle: false  // ← IMPORTANT!
  });

  // Wait for answer signal
  responder.on('signal', (answerSignal) => {
    const answerCode = generateShareCode(responder.id, answerSignal);
    console.log('Send this back:', answerCode);
    // User copies this back to Machine A
  });

  // Start connection first
  await responder.connect();

  // Then signal with the offer
  responder.signal(offerSignal);

  // Connection established
  responder.on('connect', () => {
    console.log('🎉 Connected!');
  });
}
```

### Generate QR Code

```typescript
import { createConnectionOffer, generateQRCode } from '../src/p2p/signaling';

// Generate QR for share code
const { shareCode, qrCode } = await createConnectionOffer(peerId, signal);

// Display in browser
const img = document.createElement('img');
img.src = qrCode;  // data:image/png;base64,...
document.body.appendChild(img);

// Or generate from existing code
const qrCodeDataUrl = await generateQRCode(shareCode, {
  qrWidth: 600,
  errorCorrectionLevel: 'H'
});
```

## Troubleshooting

### Connection Not Establishing

1. **Check trickle ICE is disabled**: Must be `trickle: false` on both peers
2. **Complete handshake within 30s**: Connection times out otherwise
3. **Verify signal order**: Must call `connect()` before waiting for signals
4. **Check console for errors**: Look for detailed logging

### iOS Copy Not Working

1. **Use tap-to-select**: Tap textarea to auto-select text
2. **Button fallback**: Copy button tries clipboard API then fallback
3. **Manual selection**: Long-press textarea and select "Copy"

### QR Code Not Scanning

1. **Increase error correction**: Use `errorCorrectionLevel: 'H'`
2. **Make it bigger**: Set `qrWidth: 600` or higher
3. **Better lighting**: Ensure good lighting conditions
4. **Use manual code**: Fall back to copy/paste share code

## Resources

- [SimplePeer Documentation](https://github.com/feross/simple-peer)
- [WebRTC API Reference](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [QRCode.js Documentation](https://github.com/soldair/node-qrcode)
- Main project plan: `koder/plans/01_ts-port.md`
