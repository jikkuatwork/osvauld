#!/usr/bin/env node
/**
 * CLI QR Code Demo
 *
 * Generate QR codes from the command line for WebRTC connections.
 *
 * Usage:
 *   npm run build
 *   node examples/qr-cli-demo.js create-offer
 *   node examples/qr-cli-demo.js accept-offer <SHARE_CODE>
 *   node examples/qr-cli-demo.js generate-qr <SHARE_CODE>
 */

import { createInitiator, createResponder } from '../src/p2p/webrtc-peer';
import {
  createConnectionOffer,
  parseShareCode,
  generateShareCode,
  generateQRCode,
  generateQRCodeBuffer,
} from '../src/p2p/signaling';
import * as fs from 'fs';
import * as path from 'path';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printBox(title: string, content: string) {
  const width = 80;
  const border = '═'.repeat(width);

  console.log('\n╔' + border + '╗');
  console.log(`║ ${colors.bright}${title}${colors.reset}`.padEnd(width + 15) + ' ║');
  console.log('╠' + border + '╣');

  const lines = content.split('\n');
  lines.forEach((line) => {
    const padding = width - line.length;
    console.log(`║ ${line}${' '.repeat(padding)} ║`);
  });

  console.log('╚' + border + '╝\n');
}

async function createOffer() {
  log('Creating WebRTC connection offer...', 'blue');

  // Create initiator peer
  const peer = createInitiator({
    peerId: 'cli-initiator-' + Date.now(),
  });

  // Wait for signal
  const signal = await new Promise<any>((resolve) => {
    peer.on('signal', resolve);
    peer.connect().catch(() => {});
  });

  log('✅ Signal generated!', 'green');

  // Generate share code and QR code
  const { shareCode, qrCode } = await createConnectionOffer(peer.id, signal);

  // Save QR code to file
  const qrFilename = `qr-offer-${Date.now()}.png`;
  const qrBuffer = await generateQRCodeBuffer(shareCode);
  fs.writeFileSync(qrFilename, qrBuffer);

  log(`✅ QR code saved to: ${qrFilename}`, 'green');

  printBox('SHARE CODE', shareCode);

  log('\n📱 Next Steps:', 'cyan');
  log('1. Share the code above OR the QR code image with Machine B', 'yellow');
  log('2. Machine B should run: node examples/qr-cli-demo.js accept-offer <CODE>', 'yellow');
  log('3. Machine B will generate an answer code', 'yellow');
  log('4. You need to exchange the answer back to complete the connection\n', 'yellow');

  // Save offer details
  const offerData = {
    peerId: peer.id,
    shareCode,
    timestamp: Date.now(),
  };
  fs.writeFileSync('offer-data.json', JSON.stringify(offerData, null, 2));
  log('💾 Offer data saved to offer-data.json', 'green');

  peer.disconnect();
}

async function acceptOffer(shareCode: string) {
  if (!shareCode) {
    log('❌ Error: Please provide a share code', 'red');
    log('Usage: node examples/qr-cli-demo.js accept-offer <SHARE_CODE>', 'yellow');
    process.exit(1);
  }

  log('Accepting connection offer...', 'blue');

  try {
    // Parse offer
    const { peerId: remotePeerId, signal: remoteSignal } = parseShareCode(shareCode);
    log(`✅ Parsed offer from peer: ${remotePeerId}`, 'green');

    // Create responder peer
    const peer = createResponder({
      peerId: 'cli-responder-' + Date.now(),
    });

    // Wait for answer signal
    const answerSignal = await new Promise<any>((resolve) => {
      peer.on('signal', resolve);
      peer.signal(remoteSignal);
      peer.connect().catch(() => {});
    });

    log('✅ Answer signal generated!', 'green');

    // Generate answer share code and QR
    const answerCode = generateShareCode(peer.id, answerSignal);
    const answerQr = await generateQRCodeBuffer(answerCode);

    // Save answer QR code
    const qrFilename = `qr-answer-${Date.now()}.png`;
    fs.writeFileSync(qrFilename, answerQr);

    log(`✅ Answer QR code saved to: ${qrFilename}`, 'green');

    printBox('ANSWER CODE', answerCode);

    log('\n📱 Next Steps:', 'cyan');
    log('1. Send the answer code above OR the QR code image back to Machine A', 'yellow');
    log('2. Machine A needs to signal with this answer to complete the connection\n', 'yellow');

    // Save answer details
    const answerData = {
      peerId: peer.id,
      remotePeerId,
      answerCode,
      timestamp: Date.now(),
    };
    fs.writeFileSync('answer-data.json', JSON.stringify(answerData, null, 2));
    log('💾 Answer data saved to answer-data.json', 'green');

    peer.disconnect();
  } catch (error: any) {
    log(`❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function generateQR(shareCode: string) {
  if (!shareCode) {
    log('❌ Error: Please provide a share code', 'red');
    log('Usage: node examples/qr-cli-demo.js generate-qr <SHARE_CODE>', 'yellow');
    process.exit(1);
  }

  log('Generating QR code...', 'blue');

  try {
    // Validate share code
    const { peerId } = parseShareCode(shareCode);
    log(`✅ Valid share code from peer: ${peerId}`, 'green');

    // Generate QR code
    const qrBuffer = await generateQRCodeBuffer(shareCode, {
      qrWidth: 600,
      errorCorrectionLevel: 'H',
    });

    const filename = `qr-${Date.now()}.png`;
    fs.writeFileSync(filename, qrBuffer);

    log(`✅ QR code saved to: ${filename}`, 'green');
    log(`📂 Location: ${path.resolve(filename)}`, 'cyan');

    // Also generate data URL version
    const dataUrl = await generateQRCode(shareCode);
    log(`\n📊 QR Code Stats:`, 'cyan');
    log(`   Size: ${qrBuffer.length} bytes`, 'yellow');
    log(`   Format: PNG`, 'yellow');
    log(`   Data URL length: ${dataUrl.length} chars`, 'yellow');
  } catch (error: any) {
    log(`❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
${colors.bright}WebRTC QR Code CLI Demo${colors.reset}

${colors.cyan}Commands:${colors.reset}

  ${colors.green}create-offer${colors.reset}
    Create a new WebRTC connection offer with QR code
    Example: node examples/qr-cli-demo.js create-offer

  ${colors.green}accept-offer <SHARE_CODE>${colors.reset}
    Accept a connection offer and generate an answer
    Example: node examples/qr-cli-demo.js accept-offer eyJ2ZXJzaW9uIjoxLCJwZWVySWQi...

  ${colors.green}generate-qr <SHARE_CODE>${colors.reset}
    Generate a QR code from any share code
    Example: node examples/qr-cli-demo.js generate-qr eyJ2ZXJzaW9uIjoxLCJwZWVySWQi...

  ${colors.green}help${colors.reset}
    Show this help message

${colors.cyan}Workflow:${colors.reset}

  Machine A:
    1. Run: node examples/qr-cli-demo.js create-offer
    2. Share the generated QR code or share code with Machine B
    3. Wait for answer from Machine B

  Machine B:
    1. Run: node examples/qr-cli-demo.js accept-offer <CODE_FROM_A>
    2. Share the generated answer QR code or code back to Machine A
    3. Connection established!

${colors.cyan}Output Files:${colors.reset}

  • qr-offer-*.png    - QR code image for offer
  • qr-answer-*.png   - QR code image for answer
  • offer-data.json   - Offer details
  • answer-data.json  - Answer details

${colors.yellow}Note:${colors.reset} QR codes can be scanned with any QR code reader or phone camera.
`);
}

// Main CLI
async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  console.log();

  switch (command) {
    case 'create-offer':
      await createOffer();
      break;

    case 'accept-offer':
      await acceptOffer(arg);
      break;

    case 'generate-qr':
      await generateQR(arg);
      break;

    case 'help':
    case '--help':
    case '-h':
      printHelp();
      break;

    default:
      log('❌ Unknown command', 'red');
      printHelp();
      process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    log(`❌ Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
}

export { createOffer, acceptOffer, generateQR };
