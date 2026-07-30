import { describe, expect, it } from 'vitest';
import { advanceStage, stageAtLeast, stageRank } from '../../lib/networking/stages.js';

describe('stageRank / stageAtLeast', () => {
  it('orders stages along the forward ladder', () => {
    expect(stageRank('prospect')).toBeLessThan(stageRank('contacted'));
    expect(stageRank('contacted')).toBeLessThan(stageRank('connected'));
  });

  it('treats dormant as outside the ladder', () => {
    expect(stageRank('dormant')).toBe(-1);
    expect(stageAtLeast('prospect', 'dormant')).toBe(true);
  });
});

describe('advanceStage', () => {
  it('advances on an implied interaction', () => {
    expect(advanceStage('prospect', 'email_sent', 'outbound')).toBe('contacted');
    expect(advanceStage('contacted', 'email_reply', 'inbound')).toBe('replied');
    expect(advanceStage('replied', 'coffee_chat', 'none')).toBe('connected');
  });

  it('never regresses a further-along contact', () => {
    expect(advanceStage('connected', 'email_sent', 'outbound')).toBe('connected');
    expect(advanceStage('conversation_booked', 'email_sent', 'outbound')).toBe('conversation_booked');
  });

  it('revives a dormant contact on renewed contact', () => {
    expect(advanceStage('dormant', 'email_reply', 'inbound')).toBe('replied');
  });

  it('leaves stage unchanged for interactions with no stage signal', () => {
    expect(advanceStage('prospect', 'note', 'none')).toBe('prospect');
    expect(advanceStage('contacted', 'event', 'none')).toBe('contacted');
  });

  it('an outbound call only contacts; an inbound call counts as a reply', () => {
    expect(advanceStage('prospect', 'call', 'outbound')).toBe('contacted');
    expect(advanceStage('prospect', 'call', 'inbound')).toBe('replied');
  });
});
