import type { ResourceCapability, ResourceDefinition } from './catalog';

export type ResourceActionIcon = 'landmark' | 'map' | 'file-text';

export interface ResourceActionDefinition {
  capability: ResourceCapability;
  title: string;
  description: string;
  path: string;
  icon: ResourceActionIcon;
}

const ACTIONS: Partial<Record<ResourceCapability, ResourceActionDefinition>> = {
  'bank-tracker': {
    capability: 'bank-tracker',
    title: 'Bank target tracker',
    description: 'Build and manage your target list (Module 8 workspace)',
    path: 'tracker',
    icon: 'landmark',
  },
  roadmap: {
    capability: 'roadmap',
    title: 'Personalised roadmap',
    description: 'Your week-by-week recruiting plan (unlocks after the diagnostic)',
    path: 'roadmap',
    icon: 'map',
  },
  'resume-workshop': {
    capability: 'resume-workshop',
    title: 'AI resume workshop',
    description: 'Build your master resume and improve individual bullets with AI critique',
    path: 'workshop',
    icon: 'file-text',
  },
};

/**
 * Derives the available actions for a resource from its capabilities.
 *
 * @param resource - The resource whose capabilities determine the available actions.
 * @returns The action definitions corresponding to the resource's supported capabilities.
 */
export function getResourceActions(resource: ResourceDefinition): ResourceActionDefinition[] {
  return resource.capabilities.flatMap((capability) => {
    const action = ACTIONS[capability];
    return action ? [action] : [];
  });
}
