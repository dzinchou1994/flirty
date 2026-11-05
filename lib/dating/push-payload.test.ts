import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertPushPayloadSafe, buildDatingPushPayload } from './push-payload';

describe('notification privacy', () => {
  it('builds a neutral payload without name or message text', () => {
    const payload = buildDatingPushPayload({
      kind: 'message',
      id: 'msg_opaque_1',
      ref: 'peer_opaque',
      body: 'SECRET TEXT',
      senderName: 'Nino',
    });
    assert.equal(payload.title, 'New message');
    assert.equal(payload.id, 'msg_opaque_1');
    assert.equal('body' in payload, false);
    assert.equal('senderName' in payload, false);
    assert.equal(JSON.stringify(payload).includes('SECRET'), false);
    assert.equal(JSON.stringify(payload).includes('Nino'), false);
  });

  it('rejects leaking fields at send time', () => {
    assert.throws(() =>
      assertPushPayloadSafe({
        title: 'New message',
        id: 'x',
        body: 'hi',
      }),
    );
    assert.doesNotThrow(() =>
      assertPushPayloadSafe({
        title: 'New message',
        id: 'x',
        kind: 'message',
      }),
    );
  });
});
