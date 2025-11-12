import { describe, it, expect } from 'vitest';
import { MockPeer, createMockPeerPair, MockSignaling } from '../../../src/p2p/mock-peer';
import { ConnectionState, MessageType } from '../../../src/p2p/interface';

describe('MockPeer', () => {
  describe('creation', () => {
    it('should create peer with auto-generated ID', () => {
      const peer = new MockPeer();

      expect(peer.id).toBeDefined();
      expect(peer.state).toBe(ConnectionState.DISCONNECTED);
    });

    it('should create peer with custom ID', () => {
      const peer = new MockPeer('custom-id');

      expect(peer.id).toBe('custom-id');
    });
  });

  describe('connection', () => {
    it('should connect peer', async () => {
      const peer = new MockPeer();

      let connectFired = false;
      peer.on('connect', () => {
        connectFired = true;
      });

      await peer.connect();

      expect(peer.state).toBe(ConnectionState.CONNECTED);
      expect(connectFired).toBe(true);
    });

    it('should emit connecting state', async () => {
      const peer = new MockPeer();
      const states: ConnectionState[] = [];

      peer.on('connecting', () => {
        states.push(peer.state);
      });

      peer.on('connect', () => {
        states.push(peer.state);
      });

      await peer.connect();

      expect(states).toEqual([ConnectionState.CONNECTING, ConnectionState.CONNECTED]);
    });
  });

  describe('disconnect', () => {
    it('should disconnect peer', async () => {
      const peer = new MockPeer();
      await peer.connect();

      let disconnectFired = false;
      peer.on('disconnect', () => {
        disconnectFired = true;
      });

      peer.disconnect();

      expect(peer.state).toBe(ConnectionState.DISCONNECTED);
      expect(disconnectFired).toBe(true);
    });
  });

  describe('messaging', () => {
    it('should send and receive messages', async () => {
      const [peer1, peer2] = createMockPeerPair();

      const testMessage = {
        type: MessageType.UPDATE,
        payload: 'test data',
        timestamp: Date.now(),
        sender: peer1.id,
      };

      const receivedMessages: unknown[] = [];
      peer2.on('message', (msg) => {
        receivedMessages.push(msg);
      });

      await peer1.send(testMessage);

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0]).toEqual(testMessage);
    });

    it('should track message stats', async () => {
      const [peer1, peer2] = createMockPeerPair();

      const message = {
        type: MessageType.PING,
        payload: 'ping',
        timestamp: Date.now(),
        sender: peer1.id,
      };

      await peer1.send(message);
      await peer2.send(message);

      const stats1 = peer1.getStats();
      const stats2 = peer2.getStats();

      expect(stats1.messagesSent).toBe(1);
      expect(stats1.messagesReceived).toBe(1);
      expect(stats2.messagesSent).toBe(1);
      expect(stats2.messagesReceived).toBe(1);
    });

    it('should fail to send when not connected', async () => {
      const peer = new MockPeer();

      const message = {
        type: MessageType.PING,
        payload: 'test',
        timestamp: Date.now(),
        sender: peer.id,
      };

      await expect(peer.send(message)).rejects.toThrow('Peer not connected');
    });
  });

  describe('createMockPeerPair', () => {
    it('should create connected peer pair', () => {
      const [peer1, peer2] = createMockPeerPair();

      expect(peer1.state).toBe(ConnectionState.CONNECTED);
      expect(peer2.state).toBe(ConnectionState.CONNECTED);
    });
  });

  describe('simulateDisconnect', () => {
    it('should disconnect both peers', () => {
      const [peer1, peer2] = createMockPeerPair();

      let peer1Disconnected = false;
      let peer2Disconnected = false;

      peer1.on('disconnect', () => {
        peer1Disconnected = true;
      });

      peer2.on('disconnect', () => {
        peer2Disconnected = true;
      });

      peer1.simulateDisconnect();

      expect(peer1.state).toBe(ConnectionState.DISCONNECTED);
      expect(peer2.state).toBe(ConnectionState.DISCONNECTED);
      expect(peer1Disconnected).toBe(true);
      expect(peer2Disconnected).toBe(true);
    });
  });
});

describe('MockSignaling', () => {
  it('should generate and parse share code', async () => {
    const signaling = new MockSignaling();
    const offer = { type: 'offer', data: 'test-offer' };

    const code = await signaling.generateShareCode(offer);

    expect(typeof code).toBe('string');
    expect(code.length).toBeGreaterThan(0);

    const parsed = await signaling.parseShareCode(code);

    expect(parsed).toEqual(offer);
  });

  it('should exchange signals', async () => {
    const signaling = new MockSignaling();
    const peerId = 'peer-123';
    const signal = { type: 'signal', data: 'test' };

    await signaling.exchangeSignal(peerId, signal);

    const retrieved = signaling.getSignal(peerId);

    expect(retrieved).toEqual(signal);
  });

  it('should clear signals', async () => {
    const signaling = new MockSignaling();
    const peerId = 'peer-123';
    const signal = { type: 'signal', data: 'test' };

    await signaling.exchangeSignal(peerId, signal);
    signaling.clear();

    const retrieved = signaling.getSignal(peerId);

    expect(retrieved).toBeUndefined();
  });

  it('should reject invalid share code', async () => {
    const signaling = new MockSignaling();

    await expect(signaling.parseShareCode('invalid-code')).rejects.toThrow(
      'Invalid share code'
    );
  });
});
