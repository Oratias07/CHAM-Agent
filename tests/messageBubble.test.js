/**
 * Message Bubble Dismiss Logic — unit tests
 *
 * The actual bug was a React useEffect dependency cycle:
 *   [messageAlert] in deps → close sets null → effect re-runs → re-fetches same alert → reopens
 *
 * Since we don't have @testing-library/react, we test the core logic pattern
 * that both LecturerDashboard and StudentPortal now use:
 *   - A dismissedAlertRef tracks the text of the dismissed alert
 *   - The sync callback checks `sync.alert.text !== dismissedAlertRef.current`
 *   - Closing the bubble sets dismissedAlertRef.current = alert.text
 */

import { describe, it, expect } from 'vitest';

/**
 * Simulate the sync + dismiss logic extracted from the components.
 * This mirrors exactly what the useEffect callback does.
 */
function createMessageAlertController() {
  let messageAlert = null;
  let dismissedAlertText = null; // mirrors dismissedAlertRef.current

  return {
    get alert() { return messageAlert; },

    /** Simulates what the sync callback does on each poll */
    handleSync(syncResponse) {
      if (syncResponse.alert && syncResponse.alert.text !== dismissedAlertText) {
        messageAlert = syncResponse.alert;
      }
    },

    /** Simulates clicking the X button */
    dismiss() {
      if (messageAlert) {
        dismissedAlertText = messageAlert.text;
        messageAlert = null;
      }
    },

    /** Simulates clicking "View Inbox" */
    viewInbox() {
      if (messageAlert) {
        dismissedAlertText = messageAlert.text;
        messageAlert = null;
      }
      return 'MESSAGES'; // viewMode
    },
  };
}

describe('message bubble dismiss logic', () => {
  it('shows alert on first sync with unread message', () => {
    const ctrl = createMessageAlertController();
    ctrl.handleSync({ alert: { text: 'Hello!', senderId: 's1' } });
    expect(ctrl.alert).toEqual({ text: 'Hello!', senderId: 's1' });
  });

  it('does not show alert when sync has no alert', () => {
    const ctrl = createMessageAlertController();
    ctrl.handleSync({ alert: null });
    expect(ctrl.alert).toBeNull();
  });

  it('dismissing prevents same alert from reappearing on next sync', () => {
    const ctrl = createMessageAlertController();

    // First sync: alert appears
    ctrl.handleSync({ alert: { text: 'Hello!', senderId: 's1' } });
    expect(ctrl.alert).not.toBeNull();

    // User clicks X
    ctrl.dismiss();
    expect(ctrl.alert).toBeNull();

    // Next sync returns same alert — should NOT reappear
    ctrl.handleSync({ alert: { text: 'Hello!', senderId: 's1' } });
    expect(ctrl.alert).toBeNull();
  });

  it('shows NEW alert after dismissing a different one', () => {
    const ctrl = createMessageAlertController();

    // Alert 1
    ctrl.handleSync({ alert: { text: 'First message', senderId: 's1' } });
    ctrl.dismiss();
    expect(ctrl.alert).toBeNull();

    // Alert 2 — different text, should appear
    ctrl.handleSync({ alert: { text: 'Second message', senderId: 's2' } });
    expect(ctrl.alert).toEqual({ text: 'Second message', senderId: 's2' });
  });

  it('viewInbox also prevents same alert from reappearing', () => {
    const ctrl = createMessageAlertController();

    ctrl.handleSync({ alert: { text: 'Check this', senderId: 's1' } });
    const viewMode = ctrl.viewInbox();
    expect(viewMode).toBe('MESSAGES');
    expect(ctrl.alert).toBeNull();

    // Same alert on next sync
    ctrl.handleSync({ alert: { text: 'Check this', senderId: 's1' } });
    expect(ctrl.alert).toBeNull();
  });

  it('survives multiple sync cycles without reopening dismissed alert', () => {
    const ctrl = createMessageAlertController();
    const serverAlert = { text: 'Persistent msg', senderId: 's1' };

    ctrl.handleSync({ alert: serverAlert });
    ctrl.dismiss();

    // Simulate 10 polling cycles — alert should never come back
    for (let i = 0; i < 10; i++) {
      ctrl.handleSync({ alert: serverAlert });
      expect(ctrl.alert).toBeNull();
    }
  });

  it('handles rapid dismiss-then-sync race condition', () => {
    const ctrl = createMessageAlertController();

    ctrl.handleSync({ alert: { text: 'msg', senderId: 's1' } });
    ctrl.dismiss();
    // Immediately sync again (simulates fast polling)
    ctrl.handleSync({ alert: { text: 'msg', senderId: 's1' } });
    expect(ctrl.alert).toBeNull();
  });

  it('resets when a genuinely new message arrives from same sender', () => {
    const ctrl = createMessageAlertController();

    ctrl.handleSync({ alert: { text: 'First', senderId: 's1' } });
    ctrl.dismiss();

    // Same sender, different message
    ctrl.handleSync({ alert: { text: 'Second', senderId: 's1' } });
    expect(ctrl.alert).toEqual({ text: 'Second', senderId: 's1' });
  });
});
