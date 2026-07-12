import { describe, expect, it } from 'vitest';
import {
  RESOURCE_CATALOG,
  getResourceDefinition,
  resourceHasCapability,
} from '../../web/lib/resources/catalog.js';

describe('resource catalogue', () => {
  it('defines exactly six unique resource slugs', () => {
    expect(RESOURCE_CATALOG).toHaveLength(6);
    expect(new Set(RESOURCE_CATALOG.map((resource) => resource.slug)).size).toBe(6);
  });

  it('keeps IB-only capabilities off future resources', () => {
    expect(resourceHasCapability('investment-banking-guides', 'diagnostic')).toBe(true);
    expect(resourceHasCapability('investment-banking-guides', 'bank-tracker')).toBe(true);
    expect(resourceHasCapability('investment-banking-guides', 'roadmap')).toBe(true);

    for (const resource of RESOURCE_CATALOG.filter(
      ({ slug }) => slug !== 'investment-banking-guides',
    )) {
      expect(resourceHasCapability(resource, 'diagnostic')).toBe(false);
      expect(resourceHasCapability(resource, 'bank-tracker')).toBe(false);
      expect(resourceHasCapability(resource, 'roadmap')).toBe(false);
    }
  });

  it('returns null for unregistered resources', () => {
    expect(getResourceDefinition('not-a-resource')).toBeNull();
  });
});
